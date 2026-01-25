import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl);
  console.error("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "present" : "missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkYoutubeUrls() {
  console.log("Checking YouTube URLs in database...\n");

  const { data, error } = await supabase
    .from("profiles")
    .select("psn_id, youtube_channel")
    .not("youtube_channel", "is", null)
    .limit(10);

  if (error) {
    console.error("Error:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No YouTube channels found in database.");
    return;
  }

  console.log(`Found ${data.length} profiles with YouTube channels:\n`);
  data.forEach((profile) => {
    console.log(`PSN: ${profile.psn_id}`);
    console.log(`URL: ${profile.youtube_channel}`);
    console.log("---");
  });
}

checkYoutubeUrls();
