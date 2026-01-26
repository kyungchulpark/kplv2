"use client";

import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sent_at: string;
  sender: {
    psn_id: string;
  };
}

interface MessageBubbleProps {
  message: Message;
  isFromMe: boolean;
}

export default function MessageBubble({ message, isFromMe }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isFromMe ? "items-end" : "items-start"
      )}
    >
      {!isFromMe && (
        <span className="text-xs text-muted-foreground px-1">
          {message.sender.psn_id}
        </span>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg px-4 py-2 break-words",
          isFromMe
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
      <span className="text-xs text-muted-foreground px-1">
        {formatTime(message.sent_at)}
      </span>
    </div>
  );
}
