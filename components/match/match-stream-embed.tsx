"use client";

import { ExternalLink, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MatchStreamEmbedProps {
  url: string;
  title?: string;
  description?: string;
}

export function MatchStreamEmbed({
  url,
  title = "Match Stream",
  description = "Stream link provided",
}: MatchStreamEmbedProps) {
  const embedUrl = buildEmbedUrl(url);

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full rounded-lg overflow-hidden border bg-background">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center gap-2 bg-slate-900 text-white">
            <Youtube className="h-6 w-6" />
            <div className="text-sm text-white/80">{description}</div>
          </div>
        )}
      </div>
      <Button asChild variant="outline" className="w-full gap-2">
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          Open Stream
        </a>
      </Button>
    </div>
  );
}

function buildEmbedUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Allow direct embed for already-embedded URLs
  if (url.includes("youtube.com/embed/")) {
    return url;
  }

  return null;
}

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
