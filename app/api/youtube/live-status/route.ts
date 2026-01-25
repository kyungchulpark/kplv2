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
    // Use YouTube Data API v3 channels.list with forHandle parameter
    // This is the proper way to resolve @handle to channel ID
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;

    console.log(`[YouTube API] Resolving handle with channels.list: ${handle}`);
    const response = await fetch(channelsUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[YouTube API] channels.list error: ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[YouTube API] channels.list response:`, JSON.stringify(data, null, 2));

    if (data.items && data.items.length > 0) {
      const channelId = data.items[0].id;
      console.log(`[YouTube API] Resolved @${handle} to channel ID: ${channelId}`);
      return channelId;
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
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "YouTube API key not configured" },
        { status: 500 }
      );
    }

    const body: LiveStatusRequest = await request.json();
    const { channelUrls } = body;

    if (!channelUrls || !Array.isArray(channelUrls)) {
      return NextResponse.json(
        { error: "Invalid request: channelUrls array required" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error in live-status API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
