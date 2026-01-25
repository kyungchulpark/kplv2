import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const youtubeApiKey = process.env.YOUTUBE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables!");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "present" : "missing");
  process.exit(1);
}

if (!youtubeApiKey) {
  console.error("Missing YOUTUBE_API_KEY!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

async function resolveChannelId(handle: string): Promise<string | null> {
  try {
    // Try forHandle parameter
    const handleUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(handle)}&key=${youtubeApiKey}`;
    const response = await fetch(handleUrl);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].id;
    }

    // Fallback to search
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent('@' + handle)}&type=channel&maxResults=1&key=${youtubeApiKey}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.items && searchData.items.length > 0) {
      return searchData.items[0].snippet?.channelId || searchData.items[0].id?.channelId || null;
    }

    return null;
  } catch (error) {
    console.error(`Error resolving handle ${handle}:`, error);
    return null;
  }
}

async function checkLiveStatus(channelId: string) {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${youtubeApiKey}`;
    const response = await fetch(searchUrl);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return {
        isLive: true,
        videoId: data.items[0].id.videoId,
        title: data.items[0].snippet.title,
      };
    }

    return { isLive: false };
  } catch (error) {
    console.error("Error checking live status:", error);
    return { isLive: false };
  }
}

async function checkYoutubeUrls() {
  console.log("🎥 YouTube Channel Checker");
  console.log("=".repeat(80));
  console.log(`API Key: ${youtubeApiKey.substring(0, 10)}...${youtubeApiKey.substring(youtubeApiKey.length - 4)}\n`);

  const { data, error } = await supabase
    .from("profiles")
    .select("psn_id, youtube_channel")
    .not("youtube_channel", "is", null);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No YouTube channels found in database.");
    return;
  }

  console.log(`Found ${data.length} profiles with YouTube channels\n`);

  let liveCount = 0;
  let offlineCount = 0;
  let errorCount = 0;

  for (const profile of data) {
    console.log("\n" + "-".repeat(80));
    console.log(`👤 PSN: ${profile.psn_id}`);
    console.log(`🔗 URL: ${profile.youtube_channel}`);

    const channelInfo = extractChannelInfo(profile.youtube_channel);
    if (!channelInfo) {
      console.log("❌ Could not parse URL");
      errorCount++;
      continue;
    }

    console.log(`📋 Type: ${channelInfo.type} (${channelInfo.value})`);

    let channelId: string | null = null;

    if (channelInfo.type === 'channelId') {
      channelId = channelInfo.value;
    } else {
      console.log(`🔄 Resolving to channel ID...`);
      channelId = await resolveChannelId(channelInfo.value);
    }

    if (!channelId) {
      console.log("❌ Could not resolve channel ID");
      errorCount++;
      continue;
    }

    console.log(`✅ Channel ID: ${channelId}`);

    const liveStatus = await checkLiveStatus(channelId);

    if (liveStatus.isLive) {
      console.log(`🔴 LIVE NOW!`);
      console.log(`   Video: ${liveStatus.title}`);
      console.log(`   ID: ${liveStatus.videoId}`);
      console.log(`   Watch: https://www.youtube.com/watch?v=${liveStatus.videoId}`);
      liveCount++;
    } else {
      console.log(`⚫ Offline`);
      offlineCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log("\n" + "=".repeat(80));
  console.log("📊 Summary:");
  console.log(`   🔴 Live: ${liveCount}`);
  console.log(`   ⚫ Offline: ${offlineCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📺 Total: ${data.length}`);
  console.log("=".repeat(80));
}

checkYoutubeUrls();
