"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, User, Youtube } from "lucide-react";

interface Streamer {
  id: string;
  psn_id: string;
  youtube_channel: string;
  avatar_url: string | null;
}

interface StreamListProps {
  streamers: Streamer[];
}

export function StreamList({ streamers }: StreamListProps) {
  if (streamers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Youtube className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Streamers Available</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            There are no registered streamers at the moment. Check back later or register your YouTube channel in your profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {streamers.map((streamer) => (
        <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white">
                {streamer.avatar_url ? (
                  <img
                    src={streamer.avatar_url}
                    alt={streamer.psn_id}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6" />
                )}
              </div>
              <CardTitle className="text-lg">{streamer.psn_id}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Youtube className="h-4 w-4 text-red-500" />
                <span>YouTube Channel</span>
              </div>

              <a
                href={streamer.youtube_channel}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full" variant="default">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Channel
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
