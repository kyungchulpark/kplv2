import { NextRequest, NextResponse } from "next/server";

interface LiveStatusRequest {
  channelUrls: string[];
}

interface LiveStatusResponse {
  [channelUrl: string]: {
    isLive: boolean;
    videoId?: string;
    title?: string;
  };
}

function extractChannelInfo(url: string): { type: 'channelId' | 'handle' | 'custom' | 'user'; value: string } | null {
  try {
    // Channel ID format: youtube.com/channel/UC...
    const channelIdMatch = url.match(/youtube\.com\/channel\/([a-zA-Z0-9_-]+)/);
    if (channelIdMatch) {
      return { type: 'channelId', value: channelIdMatch[1] };
    }

    // Handle format: youtube.com/@...
    const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
    if (handleMatch) {
      return { type: 'handle', value: handleMatch[1] };
    }

    // Custom URL format: youtube.com/c/...
    const customMatch = url.match(/youtube\.com\/c\/([a-zA-Z0-9_-]+)/);
    if (customMatch) {
      return { type: 'custom', value: customMatch[1] };
    }

    // Legacy user format: youtube.com/user/...
    const userMatch = url.match(/youtube\.com\/user\/([a-zA-Z0-9_-]+)/);
    if (userMatch) {
      return { type: 'user', value: userMatch[1] };
    }

    return null;
  } catch {
    return null;
  }
}

async function checkChannelLiveStatus(channelId: string, apiKey: string) {
  try {
    // First, get the channel's uploads playlist or live broadcasts
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${apiKey}`;

    console.log(`[YouTube API] Checking live status for channel: ${channelId}`);
    const response = await fetch(searchUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[YouTube API] Error ${response.status}: ${errorText}`);
      return { isLive: false };
    }

    const data = await response.json();
    console.log(`[YouTube API] Response for ${channelId}:`, JSON.stringify(data, null, 2));

    if (data.items && data.items.length > 0) {
      const liveVideo = data.items[0];
      console.log(`[YouTube API] Live video found: ${liveVideo.snippet.title} (${liveVideo.id.videoId})`);
      return {
        isLive: true,
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
      };
    }

    console.log(`[YouTube API] No live videos for channel ${channelId}`);
    return { isLive: false };
  } catch (error) {
    console.error("[YouTube API] Error checking live status:", error);
    return { isLive: false };
  }
}

async function resolveChannelId(handle: string, apiKey: string): Promise<string | null> {
  try {
    // Method 1: Try forHandle parameter (newer API)
    const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;

    console.log(`[YouTube API] Resolving handle with forHandle: ${handle}`);
    const handleResponse = await fetch(handleUrl);

    if (handleResponse.ok) {
      const handleData = await handleResponse.json();
      console.log(`[YouTube API] forHandle response:`, JSON.stringify(handleData, null, 2));

      if (handleData.items && handleData.items.length > 0) {
        const channelId = handleData.items[0].id;
        console.log(`[YouTube API] Resolved @${handle} to channel ID via forHandle: ${channelId}`);
        return channelId;
      }
    } else {
      console.log(`[YouTube API] forHandle failed with status ${handleResponse.status}, trying search fallback`);
    }

    // Method 2: Fallback to search API
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('@' + handle)}&type=channel&maxResults=1&key=${apiKey}`;

    console.log(`[YouTube API] Trying search API for: @${handle}`);
    const searchResponse = await fetch(searchUrl);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[YouTube API] Search API error: ${errorText}`);
      return null;
    }

    const searchData = await searchResponse.json();
    console.log(`[YouTube API] Search response:`, JSON.stringify(searchData, null, 2));

    if (searchData.items && searchData.items.length > 0) {
      const channelId = searchData.items[0].snippet.channelId || searchData.items[0].id?.channelId;
      if (channelId) {
        console.log(`[YouTube API] Resolved @${handle} to channel ID via search: ${channelId}`);
        return channelId;
      }
    }

    console.log(`[YouTube API] No channel found for handle: ${handle}`);
    return null;
  } catch (error) {
    console.error(`[YouTube API] Error resolving handle ${handle}:`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[YouTube API] ========== NEW REQUEST ==========");
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error("[YouTube API] API key not configured!");
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    console.log("[YouTube API] API key found, length:", apiKey.length);

    const body: LiveStatusRequest = await request.json();
    const { channelUrls } = body;

    if (!channelUrls || !Array.isArray(channelUrls)) {
      console.error("[YouTube API] Invalid request body:", body);
      return NextResponse.json(
        { error: "Invalid request: channelUrls array required" },
        { status: 400 }
      );
    }

    console.log(`[YouTube API] Processing ${channelUrls.length} channels`);
    const results: LiveStatusResponse = {};

    // Check each channel's live status
    for (const url of channelUrls) {
      console.log(`[YouTube API] Processing URL: ${url}`);
      const channelInfo = extractChannelInfo(url);

      if (!channelInfo) {
        console.log(`[YouTube API] Could not parse URL: ${url}`);
        results[url] = { isLive: false };
        continue;
      }

      console.log(`[YouTube API] Detected ${channelInfo.type}: ${channelInfo.value}`);

      let channelId: string | null = null;

      if (channelInfo.type === 'channelId') {
        // Already have the channel ID
        channelId = channelInfo.value;
        console.log(`[YouTube API] Using channel ID: ${channelId}`);
      } else if (channelInfo.type === 'handle') {
        // Resolve handle to channel ID
        console.log(`[YouTube API] Resolving handle: @${channelInfo.value}`);
        channelId = await resolveChannelId(channelInfo.value, apiKey);
        if (channelId) {
          console.log(`[YouTube API] Resolved to channel ID: ${channelId}`);
        } else {
          console.log(`[YouTube API] Failed to resolve handle: @${channelInfo.value}`);
        }
      } else {
        // For custom URLs and legacy user URLs, we need to search
        console.log(`[YouTube API] Searching for ${channelInfo.type}: ${channelInfo.value}`);
        // For now, treat as handle
        channelId = await resolveChannelId(channelInfo.value, apiKey);
      }

      if (channelId) {
        results[url] = await checkChannelLiveStatus(channelId, apiKey);
      } else {
        console.log(`[YouTube API] No channel ID found for URL: ${url}`);
        results[url] = { isLive: false };
      }
    }

    console.log("[YouTube API] ========== REQUEST COMPLETE ==========");
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
