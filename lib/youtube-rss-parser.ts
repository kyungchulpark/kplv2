import xml2js from 'xml2js';

/**
 * YouTube RSS Feed Parser
 * Uses YouTube's RSS feeds to detect recent videos without consuming API quota
 * RSS URL: https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
 */

interface YouTubeRSSEntry {
  title: string[];
  link: { $: { href: string } }[];
  published: string[];
  'yt:videoId': string[];
  author: { name: string[] }[];
}

interface YouTubeRSSFeed {
  feed: {
    title: string[];
    author: { name: string[] }[];
    entry?: YouTubeRSSEntry[];
  };
}

export interface RSSVideoInfo {
  videoId: string;
  title: string;
  publishedAt: string;
  channelTitle: string;
}

/**
 * Fetches and parses YouTube RSS feed for a channel
 * RSS feeds are free and don't consume API quota
 * @param channelId - YouTube channel ID (starts with UC)
 * @returns Array of recent videos (up to 15)
 */
export async function fetchYouTubeRSSFeed(
  channelId: string
): Promise<RSSVideoInfo[]> {
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetch(rssUrl, {
      next: { revalidate: 120 }, // Cache for 2 minutes
    });

    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }

    const xmlText = await response.text();
    const parser = new xml2js.Parser();
    const result = (await parser.parseStringPromise(xmlText)) as YouTubeRSSFeed;

    if (!result.feed || !result.feed.entry) {
      return [];
    }

    const channelTitle = result.feed.author?.[0]?.name?.[0] || 'Unknown Channel';

    return result.feed.entry.map((entry) => ({
      videoId: entry['yt:videoId'][0],
      title: entry.title[0],
      publishedAt: entry.published[0],
      channelTitle,
    }));
  } catch (error) {
    console.error('Error fetching YouTube RSS feed:', error);
    return [];
  }
}

/**
 * Checks if a specific video is currently live using YouTube Data API
 * This consumes 1 quota unit per call
 * @param videoId - YouTube video ID
 * @param apiKey - YouTube Data API key
 * @returns Live status information
 */
export async function checkVideoLiveStatus(
  videoId: string,
  apiKey: string
): Promise<{
  isLive: boolean;
  title?: string;
  thumbnailUrl?: string;
  scheduledStartTime?: string;
}> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,liveStreamingDetails&key=${apiKey}`;

    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', response.status, errorText);
      return { isLive: false };
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return { isLive: false };
    }

    const video = data.items[0];
    const snippet = video.snippet;
    const liveDetails = video.liveStreamingDetails;

    // Check if video is live or upcoming
    const isLive =
      snippet.liveBroadcastContent === 'live' ||
      snippet.liveBroadcastContent === 'upcoming';

    return {
      isLive,
      title: snippet.title,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url,
      scheduledStartTime: liveDetails?.scheduledStartTime,
    };
  } catch (error) {
    console.error('Error checking video live status:', error);
    return { isLive: false };
  }
}

/**
 * Resolves various YouTube URL formats to a channel ID
 * Handles: @handle, custom URLs, and direct channel IDs
 * @param youtubeUrl - YouTube URL or handle
 * @param apiKey - YouTube Data API key
 * @returns Channel ID or null
 */
export async function resolveChannelId(
  youtubeUrl: string,
  apiKey: string
): Promise<string | null> {
  try {
    // If it's already a channel ID (starts with UC), return it
    if (youtubeUrl.startsWith('UC') && youtubeUrl.length === 24) {
      return youtubeUrl;
    }

    // Extract handle or custom URL from various formats
    let identifier = youtubeUrl;

    // Handle @username format
    if (identifier.includes('@')) {
      const match = identifier.match(/@([a-zA-Z0-9_-]+)/);
      if (match) {
        identifier = match[1];
      }
    }

    // Handle full YouTube URLs
    if (identifier.includes('youtube.com/')) {
      const urlMatch = identifier.match(/youtube\.com\/(@[^/]+|c\/[^/]+|user\/[^/]+|channel\/([^/]+))/);
      if (urlMatch) {
        if (urlMatch[2]) {
          // Direct channel ID from URL
          return urlMatch[2];
        }
        identifier = urlMatch[1].replace(/^(c\/|user\/)/, '');
      }
    }

    // Try to resolve using YouTube Data API
    // First, try searching by handle (forHandle parameter)
    if (identifier.startsWith('@') || !identifier.startsWith('UC')) {
      const handleToSearch = identifier.startsWith('@') ? identifier.substring(1) : identifier;
      const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${handleToSearch}&key=${apiKey}`;

      const handleResponse = await fetch(handleUrl);
      if (handleResponse.ok) {
        const handleData = await handleResponse.json();
        if (handleData.items && handleData.items.length > 0) {
          return handleData.items[0].id;
        }
      }
    }

    // Fallback: try searching by username
    const searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${identifier}&key=${apiKey}`;

    const searchResponse = await fetch(searchUrl);
    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.items && searchData.items.length > 0) {
        return searchData.items[0].id;
      }
    }

    console.error('Could not resolve channel ID for:', youtubeUrl);
    return null;
  } catch (error) {
    console.error('Error resolving channel ID:', error);
    return null;
  }
}

/**
 * Hybrid approach: Check for live streams using RSS + minimal API calls
 * 1. Fetch RSS feed (0 quota)
 * 2. Check most recent videos for live status (1 quota per video)
 * @param channelId - YouTube channel ID
 * @param apiKey - YouTube Data API key
 * @param maxVideosToCheck - Maximum number of recent videos to check (default 3)
 * @returns Live stream information if found
 */
export async function checkChannelLiveStatus(
  channelId: string,
  apiKey: string,
  maxVideosToCheck: number = 3
): Promise<{
  isLive: boolean;
  videoId?: string;
  title?: string;
  thumbnailUrl?: string;
  scheduledStartTime?: string;
} | null> {
  try {
    // Step 1: Fetch RSS feed (0 quota)
    const recentVideos = await fetchYouTubeRSSFeed(channelId);

    if (recentVideos.length === 0) {
      return { isLive: false };
    }

    // Step 2: Check most recent videos for live status
    const videosToCheck = recentVideos.slice(0, maxVideosToCheck);

    for (const video of videosToCheck) {
      const liveStatus = await checkVideoLiveStatus(video.videoId, apiKey);

      if (liveStatus.isLive) {
        return {
          isLive: true,
          videoId: video.videoId,
          title: liveStatus.title || video.title,
          thumbnailUrl: liveStatus.thumbnailUrl,
          scheduledStartTime: liveStatus.scheduledStartTime,
        };
      }
    }

    return { isLive: false };
  } catch (error) {
    console.error('Error checking channel live status:', error);
    return { isLive: false };
  }
}
