"use client";

import { Youtube } from "lucide-react";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

export function YouTubeEmbed({ url, title = "Match Stream" }: YouTubeEmbedProps) {
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    return (
      <div className="aspect-video w-full rounded-lg border border-dashed flex flex-col items-center justify-center gap-3 bg-slate-900 text-white text-sm">
        <Youtube className="h-6 w-6" />
        <div>Stream offline or invalid link</div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline"
        >
          Open on YouTube
        </a>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full rounded-lg overflow-hidden border">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

export function extractYouTubeVideoId(url: string): string | null {
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
