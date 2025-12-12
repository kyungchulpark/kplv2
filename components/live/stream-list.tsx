"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User, Youtube } from "lucide-react";
import { extractYouTubeVideoId } from "@/components/match/youtube-embed";

interface Streamer {
  id: string;
  psn_id: string;
  youtube_channel: string;
  avatar_url: string | null;
}

interface StreamListProps {
  streamers: Streamer[];
}

const PAGE_SIZE = 6;

export function StreamList({ streamers }: StreamListProps) {
  const [page, setPage] = useState(1);

  const sortedStreamers = useMemo(() => {
    return [...streamers].sort((a, b) => {
      const liveDiff =
        Number(isProbablyLive(b.youtube_channel)) -
        Number(isProbablyLive(a.youtube_channel));
      if (liveDiff !== 0) return liveDiff;
      return a.psn_id.localeCompare(b.psn_id);
    });
  }, [streamers]);

  const totalPages = Math.max(1, Math.ceil(sortedStreamers.length / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleStreamers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedStreamers.slice(start, start + PAGE_SIZE);
  }, [page, sortedStreamers]);

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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleStreamers.map((streamer) => (
          <Card key={streamer.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-lg font-bold text-white overflow-hidden">
                    {streamer.avatar_url ? (
                      <img
                        src={streamer.avatar_url}
                      alt={streamer.psn_id}
                      className="h-12 w-12 object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-lg">{streamer.psn_id}</CardTitle>
                    {isProbablyLive(streamer.youtube_channel) && (
                      <Badge variant="destructive" className="w-fit text-xs">
                        LIVE
                      </Badge>
                    )}
                  </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <LivePreview url={streamer.youtube_channel} />
              <Button asChild variant="outline" className="w-full">
                <a
                  href={streamer.youtube_channel}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Channel
                </a>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function LivePreview({ url }: { url: string }) {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="aspect-video rounded-lg border border-dashed border-slate-200 flex items-center justify-center bg-slate-900 text-white text-sm">
        Stream offline or channel link only
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden border">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title="Live stream preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

function isProbablyLive(url: string) {
  const lower = url.toLowerCase();
  return (
    lower.includes("/live") ||
    lower.includes("live_stream") ||
    lower.includes("=live") ||
    lower.endsWith("/stream")
  );
}
