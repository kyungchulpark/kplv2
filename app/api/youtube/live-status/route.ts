import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface LiveStatusRequest {
  channelUrls: string[];
}

interface LiveStatusResponse {
  [channelUrl: string]: {
    isLive: boolean;
    videoId?: string;
  };
}

type CachedRow = {
  youtube_url: string;
  last_checked_at: string | null;
  last_live_status: boolean | null;
  last_live_video_id: string | null;
};

const LIVE_STATUS_TTL_MS = 2 * 60 * 1000;

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

export async function POST(request: NextRequest) {
  try {
    const body: LiveStatusRequest = await request.json();
    const { channelUrls } = body;

    if (!channelUrls || !Array.isArray(channelUrls)) {
      return NextResponse.json(
        { error: "Invalid request: channelUrls array required" },
        { status: 400 }
      );
    }

    if (channelUrls.length === 0) {
      return NextResponse.json({} as LiveStatusResponse);
    }

    const normalizedMap = new Map<string, string>();
    const uniqueUrls: string[] = [];
    const seen = new Set<string>();

    for (const url of channelUrls) {
      const normalized = normalizeYouTubeUrl(url);
      if (!normalized) continue;
      normalizedMap.set(url, normalized);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        uniqueUrls.push(normalized);
      }
    }

    if (uniqueUrls.length === 0) {
      return NextResponse.json({} as LiveStatusResponse);
    }

    const supabase = await createClient();
    const { data: cacheRows, error } = await supabase
      .from("youtube_channel_cache")
      .select("youtube_url, last_checked_at, last_live_status, last_live_video_id")
      .in("youtube_url", uniqueUrls);

    if (error) {
      console.error("[YouTube Cache] Error reading cache:", error);
      return NextResponse.json({} as LiveStatusResponse);
    }

    const cacheByUrl = new Map<string, CachedRow>();
    (cacheRows || []).forEach((row: CachedRow) => {
      const existing = cacheByUrl.get(row.youtube_url);
      if (!existing) {
        cacheByUrl.set(row.youtube_url, row);
        return;
      }
      const existingTime = existing.last_checked_at ? new Date(existing.last_checked_at).getTime() : 0;
      const currentTime = row.last_checked_at ? new Date(row.last_checked_at).getTime() : 0;
      if (currentTime >= existingTime) {
        cacheByUrl.set(row.youtube_url, row);
      }
    });

    const results: LiveStatusResponse = {};

    for (const [original, normalized] of normalizedMap.entries()) {
      const cached = cacheByUrl.get(normalized);
      const fresh = isFresh(cached?.last_checked_at || null, LIVE_STATUS_TTL_MS);
      const isLive = !!cached?.last_live_status && fresh;
      results[original] = {
        isLive,
        videoId: isLive ? cached?.last_live_video_id || undefined : undefined,
      };
    }

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("[YouTube Cache] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
