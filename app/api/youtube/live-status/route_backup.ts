import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  resolveChannelId,
  checkChannelLiveStatus,
} from "@/lib/youtube-rss-parser";

interface LiveStatusRequest {
  channelUrls: string[];
}

interface LiveStatusResponse {
  [channelUrl: string]: {
    isLive: boolean;
    videoId?: string;
    title?: string;
    thumbnailUrl?: string;
  };
}

interface CachedChannel {
  id: string;
  profile_id: string;
  youtube_url: string;
  channel_id: string;
  channel_title: string | null;
  last_resolved_at: string;
  last_checked_at: string | null;
  last_live_status: boolean;
  last_live_video_id: string | null;
}

/**
 * Gets or resolves a channel ID from the cache
 * If not cached or cache is old (>7 days), resolves and caches it
 */
async function getOrResolveChannelId(
  youtubeUrl: string,
  apiKey: string,
  supabase: any
): Promise<string | null> {
  try {
    // Try to get from cache first
    const { data: cached, error: cacheError } = await supabase
      .from("youtube_channel_cache")
      .select("*")
      .eq("youtube_url", youtubeUrl)
      .single();

    if (!cacheError && cached) {
      const cacheAge = Date.now() - new Date(cached.last_resolved_at).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      // If cache is fresh (< 7 days), use it
      if (cacheAge < sevenDays) {
        console.log(`[YouTube Cache] Using cached channel ID for ${youtubeUrl}: ${cached.channel_id}`);
        return cached.channel_id;
      }

      console.log(`[YouTube Cache] Cache expired for ${youtubeUrl}, re-resolving...`);
    }

    // Resolve the channel ID
    console.log(`[YouTube API] Resolving channel ID for: ${youtubeUrl}`);
    const channelId = await resolveChannelId(youtubeUrl, apiKey);

    if (!channelId) {
      console.error(`[YouTube API] Failed to resolve channel ID for: ${youtubeUrl}`);
      return null;
    }

    console.log(`[YouTube API] Resolved ${youtubeUrl} to channel ID: ${channelId}`);

    // Update or insert into cache
    const { error: upsertError } = await supabase
      .from("youtube_channel_cache")
      .upsert(
        {
          youtube_url: youtubeUrl,
          channel_id: channelId,
          last_resolved_at: new Date().toISOString(),
        },
        {
          onConflict: "youtube_url",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      console.error("[YouTube Cache] Error upserting cache:", upsertError);
    } else {
      console.log(`[YouTube Cache] Cached channel ID: ${channelId} for ${youtubeUrl}`);
    }

    return channelId;
  } catch (error) {
    console.error("[YouTube Cache] Error in getOrResolveChannelId:", error);
    return null;
  }
}

/**
 * Updates the cache with live status information
 */
async function updateLiveStatusCache(
  channelId: string,
  isLive: boolean,
  videoId: string | undefined,
  supabase: any
): Promise<void> {
  try {
    const { error } = await supabase
      .from("youtube_channel_cache")
      .update({
        last_checked_at: new Date().toISOString(),
        last_live_status: isLive,
        last_live_video_id: videoId || null,
      })
      .eq("channel_id", channelId);

    if (error) {
      console.error("[YouTube Cache] Error updating live status:", error);
    }
  } catch (error) {
    console.error("[YouTube Cache] Error in updateLiveStatusCache:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[YouTube API] ========== NEW REQUEST (RSS MODE) ==========");
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error("[YouTube API] API key not configured!");
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const supabase = await createClient();
    const body: LiveStatusRequest = await request.json();
    const { channelUrls } = body;

    if (!channelUrls || !Array.isArray(channelUrls)) {
      console.error("[YouTube API] Invalid request body:", body);
      return NextResponse.json(
        { error: "Invalid request: channelUrls array required" },
        { status: 400 }
      );
    }

    console.log(`[YouTube API] Processing ${channelUrls.length} channels using RSS + API hybrid`);
    const results: LiveStatusResponse = {};

    // Process each channel
    for (const url of channelUrls) {
      console.log(`[YouTube API] Processing URL: ${url}`);

      // Get or resolve channel ID (uses cache to minimize API calls)
      const channelId = await getOrResolveChannelId(url, apiKey, supabase);

      if (!channelId) {
        console.log(`[YouTube API] Could not resolve channel ID for: ${url}`);
        results[url] = { isLive: false };
        continue;
      }

      // Check live status using RSS + minimal API calls
      console.log(`[YouTube RSS] Checking live status for channel: ${channelId}`);
      const liveStatus = await checkChannelLiveStatus(
        channelId,
        apiKey,
        3 // Check up to 3 most recent videos
      );

      if (liveStatus) {
        results[url] = {
          isLive: liveStatus.isLive,
          videoId: liveStatus.videoId,
          title: liveStatus.title,
          thumbnailUrl: liveStatus.thumbnailUrl,
        };

        console.log(
          `[YouTube RSS] Channel ${channelId} live status: ${liveStatus.isLive}`,
          liveStatus.isLive ? `(${liveStatus.videoId})` : ""
        );

        // Update cache with live status
        await updateLiveStatusCache(
          channelId,
          liveStatus.isLive,
          liveStatus.videoId,
          supabase
        );
      } else {
        results[url] = { isLive: false };
        await updateLiveStatusCache(channelId, false, undefined, supabase);
      }
    }

    console.log("[YouTube API] ========== REQUEST COMPLETE ==========");
    console.log(`[YouTube API] Quota saved: Using RSS (0 quota) + Videos API (${channelUrls.length * 1-3} units) instead of Search API (${channelUrls.length * 100} units)`);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("[YouTube API] ========== FATAL ERROR ==========");
    console.error("[YouTube API] Error type:", error?.constructor?.name);
    console.error("[YouTube API] Error message:", error?.message);
    console.error("[YouTube API] Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}
