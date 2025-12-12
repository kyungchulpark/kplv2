import { createClient } from "@/utils/supabase/server";
import { StreamList } from "@/components/live/stream-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";

export const metadata = {
  title: "Live Streams - KPL",
  description: "Watch KPL streamers live on YouTube",
};

export default async function LivePage() {
  const supabase = await createClient();

  // Get all users with YouTube channels registered
  const { data: streamers, error } = await supabase
    .from("profiles")
    .select("id, psn_id, youtube_channel, avatar_url")
    .not("youtube_channel", "is", null)
    .order("psn_id");

  if (error) {
    console.error("Error fetching streamers:", error);
  }

  const validStreamers = streamers?.filter(
    (s) => s.youtube_channel && s.youtube_channel.trim() !== ""
  ) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold">Live Streams</h1>
        </div>
        <p className="text-muted-foreground">
          Watch KPL players streaming their games on YouTube
        </p>
      </div>

      <div className="mb-8">
        <Card className="bg-gradient-to-r from-red-500/10 to-purple-500/10 border-red-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-red-500" />
              About Live Streams
            </CardTitle>
            <CardDescription>
              Support your fellow KPL players by watching their streams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              This page shows all KPL players who have registered their YouTube channels.
              Click on any streamer card to visit their channel and watch their content.
            </p>
            <p className="text-muted-foreground">
              Want to add your channel? Update your YouTube channel URL in your profile settings.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">
          KPL Streamers ({validStreamers.length})
        </h2>
      </div>

      <StreamList streamers={validStreamers} />
    </div>
  );
}
