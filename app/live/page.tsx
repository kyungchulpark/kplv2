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
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Radio className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold">Live Streams</h1>
        </div>
        <p className="text-muted-foreground">
          Watch KPL players streaming their games on YouTube.
        </p>
      </div>

      <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50 to-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700">
            <Radio className="h-5 w-5" />
            How it works
          </CardTitle>
          <CardDescription>
            Registered YouTube channels appear below. Add your link in profile settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            Live channels are highlighted with embedded video players. Offline channels are listed
            below for quick access without heavy embeds.
          </p>
          <p>
            Support your fellow competitors, scout opponents, or enjoy live content directly inside KPL.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold">
          Streamers ({validStreamers.length})
        </h2>
      </div>

      <StreamList streamers={validStreamers} />
    </div>
  );
}
