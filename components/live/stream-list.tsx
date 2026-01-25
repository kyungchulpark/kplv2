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

const PAGE_SIZE = 6;

export function StreamList({ streamers }: StreamListProps) {
  const [page, setPage] = useState(1);
  const [liveStatus, setLiveStatus] = useState<LiveStatusMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Fetch live status for all streamers
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

    // Refresh every 2 minutes
    const interval = setInterval(fetchLiveStatus, 120000);

    return () => clearInterval(interval);
  }, [streamers]);

  // Separate live and offline streamers
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

  const sortedStreamers = useMemo(() => {
    return [...liveStreamers, ...offlineStreamers];
  }, [liveStreamers, offlineStreamers]);

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

  const renderStreamerCard = (streamer: Streamer) => {
    const streamStatus = liveStatus[streamer.youtube_channel];
    const isLive = streamStatus?.isLive || false;

    return (
      <Card
        key={streamer.id}
        className={`hover:shadow-lg transition-shadow ${isLive ? 'ring-2 ring-red-500' : ''}`}
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
                  🔴 LIVE
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

  return (
    <div className="space-y-8">
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking live status...
        </div>
      )}

      {/* Live Streamers Section */}
      {!isLoading && liveStreamers.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
            <h2 className="text-lg font-bold text-red-600 flex items-center gap-2 px-4 py-1.5 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-200 dark:border-red-800">
              <span className="animate-pulse">🔴</span>
              LIVE NOW ({liveStreamers.length})
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveStreamers.map(renderStreamerCard)}
          </div>
        </div>
      )}

      {/* Offline Streamers Section */}
      {!isLoading && offlineStreamers.length > 0 && (
        <div className="space-y-4">
          {liveStreamers.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <h2 className="text-sm font-semibold text-muted-foreground px-4 py-1.5 bg-muted rounded-full">
                Offline Channels ({offlineStreamers.length})
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offlineStreamers.slice(0, page * PAGE_SIZE).map(renderStreamerCard)}
          </div>
          {offlineStreamers.length > page * PAGE_SIZE && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPage((prev) => prev + 1)}
              >
                Load More
              </Button>
            </div>
          )}
        </div>
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
  // Use live video ID if available, otherwise try to extract from URL
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
        src={`https://www.youtube.com/embed/${videoId}${isLive ? '?autoplay=1&mute=1' : ''}`}
        title="Live stream preview"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}
