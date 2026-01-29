// supabase/functions/youtube-live-cron/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESOLVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const RSS_CONCURRENCY = 8;
const VIDEO_BATCH_SIZE = 50;

type CachedRow = {
  youtube_url: string;
  channel_id: string | null;
  last_resolved_at: string | null;
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

async function fetchYouTubeRSSLatestVideoId(channelId: string): Promise<string | null> {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  try {
    const response = await fetch(rssUrl, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    const xmlText = await response.text();
    const match = xmlText.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    return match?.[1] || null;
  } catch (error) {
    console.error("[YouTube Cron] RSS fetch error:", error);
    return null;
  }
}

async function resolveChannelId(
  youtubeUrl: string,
  apiKey: string
): Promise<string | null> {
  try {
    if (youtubeUrl.startsWith("UC") && youtubeUrl.length === 24) {
      return youtubeUrl;
    }

    let identifier = youtubeUrl;

    if (identifier.includes("@")) {
      const match = identifier.match(/@([a-zA-Z0-9_-]+)/);
      if (match) {
        identifier = match[1];
      }
    }

    if (identifier.includes("youtube.com/")) {
      const urlMatch = identifier.match(/youtube\.com\/(?:@[^/]+|c\/[^/]+|user\/[^/]+|channel\/([^/]+))/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
      const handleMatch = identifier.match(/youtube\.com\/(@[^/]+)/);
      if (handleMatch) {
        identifier = handleMatch[1].replace("@", "");
      }
    }

    const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${identifier}&key=${apiKey}`;
    const handleResponse = await fetch(handleUrl, { cache: "no-store" });
    if (handleResponse.ok) {
      const handleData = await handleResponse.json();
      if (handleData.items && handleData.items.length > 0) {
        return handleData.items[0].id;
      }
    }

    const searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${identifier}&key=${apiKey}`;
    const searchResponse = await fetch(searchUrl, { cache: "no-store" });
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.items && searchData.items.length > 0) {
        return searchData.items[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error("[YouTube Cron] Error resolving channel ID:", error);
    return null;
  }
}

async function fetchVideoStatuses(
  videoIds: string[],
  apiKey: string
): Promise<Map<string, VideoStatus>> {
  const statusMap = new Map<string, VideoStatus>();

  for (const chunk of chunkArray(videoIds, VIDEO_BATCH_SIZE)) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${chunk.join(",")}&key=${apiKey}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[YouTube Cron] videos.list error:", response.status, errorText);
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
      console.error("[YouTube Cron] videos.list fetch error:", error);
    }
  }

  return statusMap;
}

serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("YOUTUBE_API_KEY");

  if (!url || !serviceKey || !apiKey) {
    return new Response("Missing env", { status: 500 });
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: streamers, error } = await supabase
    .from("profiles")
    .select("id, youtube_channel")
    .not("youtube_channel", "is", null);

  if (error) {
    console.error("[YouTube Cron] Failed to load streamers:", error);
    return new Response("Failed to load streamers", { status: 500 });
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
    return new Response(JSON.stringify({ total: 0, checked: 0, live: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: cacheRows } = await supabase
    .from("youtube_channel_cache")
    .select("youtube_url, channel_id, last_resolved_at")
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
    const latestVideoId = await fetchYouTubeRSSLatestVideoId(entry.channelId);
    return {
      ...entry,
      latestVideoId,
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

  return new Response(
    JSON.stringify({
      total: uniqueUrls.length,
      resolved: channelEntries.length,
      checked: statusRows.length,
      live: liveCount,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
