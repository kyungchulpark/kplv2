"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquarePlus } from "lucide-react";
import StartConversationDialog from "./start-conversation-dialog";
import { subscribeToConversations, unsubscribeChannel } from "@/lib/realtime-helpers";
import { RealtimeChannel } from "@supabase/supabase-js";

interface Conversation {
  id: string;
  otherUser: {
    id: string;
    psn_id: string;
    avatar_url: string | null;
  };
  lastMessage: {
    content: string;
    sentAt: string;
    isFromMe: boolean;
  } | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

interface Player {
  id: string;
  psn_id: string;
  avatar_url: string | null;
  email: string;
}

interface ConversationListProps {
  currentUserId: string;
  availablePlayers: Player[];
  selectedConversationId: string | null;
  onSelectConversation: (
    conversationId: string,
    otherUser: { id: string; psn_id: string; avatar_url: string | null }
  ) => void;
}

export default function ConversationList({
  currentUserId,
  availablePlayers,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    loadConversations();

    // Subscribe to real-time updates
    const channel = subscribeToConversations(currentUserId, () => {
      console.log("[ConversationList] Realtime update received, reloading...");
      loadConversations();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [currentUserId]);

  async function loadConversations() {
    try {
      const response = await fetch("/api/messages/conversations");
      if (!response.ok) throw new Error("Failed to load conversations");

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleStartConversation = async (userId: string) => {
    try {
      const response = await fetch("/api/messages/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: userId }),
      });

      if (!response.ok) throw new Error("Failed to create conversation");

      const data = await response.json();
      setDialogOpen(false);
      onSelectConversation(data.conversation.id, data.conversation.otherUser);
      await loadConversations();
    } catch (error) {
      console.error("Error starting conversation:", error);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // Less than a week
      return date.toLocaleDateString("ko-KR", { weekday: "short" });
    } else {
      return date.toLocaleDateString("ko-KR", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>메시지</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            <MessageSquarePlus className="h-4 w-4 mr-1" />
            새 대화
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              로딩 중...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              대화가 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() =>
                    onSelectConversation(conv.id, conv.otherUser)
                  }
                  className={`w-full p-4 hover:bg-accent transition-colors text-left ${
                    selectedConversationId === conv.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={conv.otherUser.avatar_url || undefined} />
                      <AvatarFallback>
                        {conv.otherUser.psn_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold truncate">
                          {conv.otherUser.psn_id}
                        </span>
                        {conv.lastMessageAt && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTime(conv.lastMessageAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.lastMessage
                            ? `${conv.lastMessage.isFromMe ? "나: " : ""}${
                                conv.lastMessage.content
                              }`
                            : "대화를 시작하세요"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <Badge variant="default" className="ml-auto">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>

      <StartConversationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        players={availablePlayers}
        onSelectPlayer={handleStartConversation}
      />
    </>
  );
}
