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

    const response = await fetch(searchUrl);

    if (!response.ok) {
      console.error(`YouTube API error: ${response.status}`);
      return { isLive: false };
    }

    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const liveVideo = data.items[0];
      return {
        isLive: true,
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
      };
    }

    return { isLive: false };
  } catch (error) {
    console.error("Error checking live status:", error);
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
      let channelId = extractChannelId(url);

      // If we couldn't extract a channel ID directly, try to resolve it
      if (!channelId) {
        const handleMatch = url.match(/@([a-zA-Z0-9_-]+)/);
        if (handleMatch) {
          channelId = await resolveChannelId(handleMatch[1], apiKey);
        }
      }

      if (channelId) {
        results[url] = await checkChannelLiveStatus(channelId, apiKey);
      } else {
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
