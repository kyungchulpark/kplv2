"use client";

import { Youtube } from "lucide-react";

interface YouTubeEmbedProps {
  url: string;
  title?: string;
}

export function YouTubeEmbed({ url, title = "Match Stream" }: YouTubeEmbedProps) {
  // Extract video ID from URL
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) {
    // Not a YouTube URL - show link instead
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-blue-600 hover:underline dark:text-blue-400"
      >
        <Youtube className="h-4 w-4" />
        스트리밍 보기
      </a>
    );
  }

  // Embed YouTube player
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

/**
 * Extract YouTube video ID from various URL formats
 *
 * Supported formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 *
 * @param url - YouTube URL
 * @returns Video ID or null if not found
 */
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}
