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

function extractChannelId(url: string): string | null {
  try {
    const patterns = [
      /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
      /youtube\.com\/@([a-zA-Z0-9_-]+)/,
      /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
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

async function resolveChannelId(handleOrUsername: string, apiKey: string): Promise<string | null> {
  try {
    // Try to resolve @handle or username to channel ID
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handleOrUsername)}&type=channel&maxResults=1&key=${apiKey}`;

    const response = await fetch(searchUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].snippet.channelId;
    }

    return null;
  } catch {
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
      let channelId = extractChannelId(url);

      // If we couldn't extract a channel ID directly, try to resolve it
      if (!channelId) {
        const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
        if (handleMatch) {
          console.log(`[YouTube API] Resolving handle: @${handleMatch[1]}`);
          channelId = await resolveChannelId(handleMatch[1], apiKey);
          if (channelId) {
            console.log(`[YouTube API] Resolved to channel ID: ${channelId}`);
          }
        } else {
          console.log(`[YouTube API] Could not extract handle from URL: ${url}`);
        }
      } else {
        console.log(`[YouTube API] Extracted channel ID: ${channelId}`);
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
