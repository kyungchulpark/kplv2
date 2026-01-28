"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, User, Youtube, Loader2 } from "lucide-react";
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

interface LiveStatus {
  isLive: boolean;
  videoId?: string;
  title?: string;
}

interface LiveStatusMap {
  [channelUrl: string]: LiveStatus;
}

export function StreamList({ streamers }: StreamListProps) {
  const [liveStatus, setLiveStatus] = useState<LiveStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLiveStatus = async () => {
      if (streamers.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/youtube/live-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channelUrls: streamers.map((s) => s.youtube_channel),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setLiveStatus(data);
        }
      } catch (error) {
        console.error("Error fetching live status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveStatus();
  }, [streamers]);

  const liveStreamers = useMemo(() => {
    return streamers
      .filter((s) => liveStatus[s.youtube_channel]?.isLive)
      .sort((a, b) => a.psn_id.localeCompare(b.psn_id));
  }, [streamers, liveStatus]);

  const offlineStreamers = useMemo(() => {
    return streamers
      .filter((s) => !liveStatus[s.youtube_channel]?.isLive)
      .sort((a, b) => a.psn_id.localeCompare(b.psn_id));
  }, [streamers, liveStatus]);

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

  const renderLiveCard = (streamer: Streamer) => {
    const streamStatus = liveStatus[streamer.youtube_channel];
    const isLive = streamStatus?.isLive || false;

    return (
      <Card
        key={streamer.id}
        className={`hover:shadow-lg transition-shadow ${isLive ? "ring-2 ring-red-500 shadow-lg" : ""}`}
      >
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
              {isLive && (
                <Badge variant="destructive" className="w-fit text-xs animate-pulse">
                  LIVE
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <LivePreview
            url={streamer.youtube_channel}
            liveVideoId={streamStatus?.videoId}
            isLive={isLive}
          />
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
    );
  };

  const renderOfflineRow = (streamer: Streamer) => (
    <div
      key={streamer.id}
      className="flex flex-col gap-3 border-b border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white overflow-hidden">
          {streamer.avatar_url ? (
            <img
              src={streamer.avatar_url}
              alt={streamer.psn_id}
              className="h-10 w-10 object-cover"
            />
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>
        <div>
          <div className="font-semibold">{streamer.psn_id}</div>
          <div className="text-xs text-muted-foreground">Offline</div>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <a
          href={streamer.youtube_channel}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Visit Channel
        </a>
      </Button>
    </div>
  );

  return (
    <div className="space-y-8">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking live status...
        </div>
      )}

      {!isLoading && liveStreamers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2 px-4 py-1.5 bg-red-50 rounded-full border border-red-200">
              LIVE NOW ({liveStreamers.length})
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveStreamers.map(renderLiveCard)}
          </div>
        </div>
      )}

      {!isLoading && liveStreamers.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No live streams right now.
          </CardContent>
        </Card>
      )}

      {!isLoading && offlineStreamers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">
              Offline Channels ({offlineStreamers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {offlineStreamers.map(renderOfflineRow)}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LivePreview({
  url,
  liveVideoId,
  isLive,
}: {
  url: string;
  liveVideoId?: string;
  isLive: boolean;
}) {
  const videoId = liveVideoId || extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="aspect-video rounded-lg border border-dashed border-slate-200 flex items-center justify-center bg-slate-900 text-white text-sm">
        {isLive ? "Loading stream..." : "Stream offline"}
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden border">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}${isLive ? "?autoplay=1&mute=1" : ""}`}
        title="Live stream preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
