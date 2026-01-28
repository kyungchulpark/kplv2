import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { fetchYouTubeRSSFeed, resolveChannelId } from "@/lib/youtube-rss-parser";

const RESOLVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RSS_REVALIDATE_SECONDS = 30;
const RSS_CONCURRENCY = 8;
const VIDEO_BATCH_SIZE = 50;

type CachedRow = {
  youtube_url: string;
  channel_id: string | null;
  last_resolved_at: string | null;
  last_checked_at: string | null;
  last_live_status: boolean | null;
  last_live_video_id: string | null;
};

type ChannelEntry = {
  url: string;
  channelId: string;
};

type RSSResult = ChannelEntry & {
  latestVideoId: string | null;
};

type VideoStatus = {
  isLive: boolean;
  title?: string;
  thumbnailUrl?: string;
};

function normalizeYouTubeUrl(value: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("UC") && trimmed.length === 24) {
    return `https://www.youtube.com/channel/${trimmed}`;
  }

  if (trimmed.startsWith("@")) {
    return `https://www.youtube.com/${trimmed}`;
  }

  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      return `https://www.youtube.com${path}`;
    }
    return `${url.protocol}//${url.hostname}${path}`;
  } catch {
    return trimmed;
  }
}

function isFresh(timestamp: string | null, ttlMs: number) {
  if (!timestamp) return false;
  const age = Date.now() - new Date(timestamp).getTime();
  return Number.isFinite(age) && age >= 0 && age < ttlMs;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await handler(items[current]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchVideoStatuses(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, VideoStatus>> {
  const statusMap = new Map<string, VideoStatus>();

  for (const chunk of chunkArray(videoIds, VIDEO_BATCH_SIZE)) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${chunk.join(",")}&key=${apiKey}`;
    try {
      const response = await fetch(url, { next: { revalidate: 30 } });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[YouTube API] videos.list error:", response.status, errorText);
        continue;
      }
      const data = await response.json();
      const items = data.items || [];
      for (const item of items) {
        const snippet = item.snippet || {};
        const isLive = snippet.liveBroadcastContent === "live";
        statusMap.set(item.id, {
          isLive,
          title: snippet.title,
          thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
        });
      }
    } catch (error) {
      console.error("[YouTube API] videos.list fetch error:", error);
    }
  }

  return statusMap;
}

export async function GET(request: NextRequest) {
  try {
    const cronHeader = request.headers.get("x-vercel-cron");
    const secret = process.env.CRON_SECRET;

    if (process.env.NODE_ENV === "production") {
      const urlSecret = request.nextUrl.searchParams.get("secret");
      if (secret && urlSecret !== secret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (!secret && cronHeader !== "1") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const supabase = createServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Service role key not configured" },
        { status: 500 }
      );
    }

    const { data: streamers, error } = await supabase
      .from("profiles")
      .select("id, youtube_channel")
      .not("youtube_channel", "is", null);

    if (error) {
      console.error("[YouTube Cron] Failed to load streamers:", error);
      return NextResponse.json({ error: "Failed to load streamers" }, { status: 500 });
    }

    const normalizedMap = new Map<string, string>();
    const uniqueUrls: string[] = [];
    const seen = new Set<string>();

    for (const streamer of streamers || []) {
      const normalized = normalizeYouTubeUrl(streamer.youtube_channel || "");
      if (!normalized) continue;
      normalizedMap.set(streamer.youtube_channel, normalized);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueUrls.push(normalized);
      }
    }

    if (uniqueUrls.length === 0) {
      return NextResponse.json({ total: 0, checked: 0, live: 0 });
    }

    const { data: cacheRows } = await supabase
      .from("youtube_channel_cache")
      .select(
        "youtube_url, channel_id, last_resolved_at, last_checked_at, last_live_status, last_live_video_id"
      )
      .in("youtube_url", uniqueUrls);

    const cacheByUrl = new Map<string, CachedRow>();
    (cacheRows || []).forEach((row: CachedRow) => {
      const existing = cacheByUrl.get(row.youtube_url);
      if (!existing) {
        cacheByUrl.set(row.youtube_url, row);
        return;
      }
      const existingTime = existing.last_resolved_at ? new Date(existing.last_resolved_at).getTime() : 0;
      const currentTime = row.last_resolved_at ? new Date(row.last_resolved_at).getTime() : 0;
      if (currentTime >= existingTime) {
        cacheByUrl.set(row.youtube_url, row);
      }
    });

    const resolvedRows: Array<{ youtube_url: string; channel_id: string; last_resolved_at: string }> = [];
    const channelEntries: ChannelEntry[] = [];

    for (const url of uniqueUrls) {
      const cached = cacheByUrl.get(url);
      let channelId = cached?.channel_id || null;

      if (!channelId || !isFresh(cached?.last_resolved_at || null, RESOLVE_CACHE_TTL_MS)) {
        channelId = await resolveChannelId(url, apiKey);
        if (channelId) {
          resolvedRows.push({
            youtube_url: url,
            channel_id: channelId,
            last_resolved_at: new Date().toISOString(),
          });
        }
      }

      if (channelId) {
        channelEntries.push({ url, channelId });
      }
    }

    if (resolvedRows.length > 0) {
      const { error: resolveError } = await supabase
        .from("youtube_channel_cache")
        .upsert(resolvedRows, { onConflict: "channel_id" });
      if (resolveError) {
        console.error("[YouTube Cron] Failed to upsert resolved channels:", resolveError);
      }
    }

    const rssResults = await mapWithConcurrency(channelEntries, RSS_CONCURRENCY, async (entry) => {
      const videos = await fetchYouTubeRSSFeed(entry.channelId, {
        revalidate: RSS_REVALIDATE_SECONDS,
      });
      return {
        ...entry,
        latestVideoId: videos[0]?.videoId || null,
      } as RSSResult;
    });

    const videoIds = Array.from(
      new Set(rssResults.map((result) => result.latestVideoId).filter(Boolean))
    ) as string[];

    const videoStatusMap = await fetchVideoStatuses(videoIds, apiKey);
    const now = new Date().toISOString();

    const statusRows: Array<{
      youtube_url: string;
      channel_id: string;
      last_checked_at: string;
      last_live_status: boolean;
      last_live_video_id: string | null;
    }> = [];

    let liveCount = 0;

    for (const result of rssResults) {
      const videoId = result.latestVideoId;
      const status = videoId ? videoStatusMap.get(videoId) : null;
      const isLive = !!status?.isLive;

      if (isLive) {
        liveCount += 1;
      }

      statusRows.push({
        youtube_url: result.url,
        channel_id: result.channelId,
        last_checked_at: now,
        last_live_status: isLive,
        last_live_video_id: isLive && videoId ? videoId : null,
      });
    }

    if (statusRows.length > 0) {
      const { error: statusError } = await supabase
        .from("youtube_channel_cache")
        .upsert(statusRows, { onConflict: "channel_id" });
      if (statusError) {
        console.error("[YouTube Cron] Failed to upsert live status:", statusError);
      }
    }

    return NextResponse.json({
      total: uniqueUrls.length,
      resolved: channelEntries.length,
      checked: statusRows.length,
      live: liveCount,
    });
  } catch (error) {
    console.error("[YouTube Cron] Fatal error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
