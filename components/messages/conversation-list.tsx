"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { MessageSquarePlus, X } from "lucide-react";
import StartConversationDialog from "./start-conversation-dialog";
import {
  subscribeToConversations,
  unsubscribeChannel,
} from "@/lib/realtime-helpers";

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

const HIDDEN_STORAGE_KEY = "kpl.hiddenConversations.v1";

function readHiddenMeta(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(HIDDEN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.warn("[ConversationList] Failed to read hidden meta:", error);
    return {};
  }
}

function writeHiddenMeta(meta: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDDEN_STORAGE_KEY, JSON.stringify(meta));
  } catch (error) {
    console.warn("[ConversationList] Failed to write hidden meta:", error);
  }
}

function hasMetaChanged(
  prev: Record<string, string>,
  next: Record<string, string>
) {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return true;
  return prevKeys.some((key) => prev[key] !== next[key]);
}

function sortConversations(list: Conversation[]) {
  return [...list].sort((a, b) => {
    const aTime = a.lastMessageAt || a.createdAt;
    const bTime = b.lastMessageAt || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

function applyHiddenFilter(
  list: Conversation[],
  meta: Record<string, string>
): { visible: Conversation[]; nextMeta: Record<string, string> } {
  const nextMeta = { ...meta };
  const visible = list.filter((conv) => {
    const hiddenAt = meta[conv.id];
    if (!hiddenAt) return true;

    const latestActivityAt = conv.lastMessageAt || conv.createdAt;
    if (latestActivityAt && new Date(latestActivityAt) > new Date(hiddenAt)) {
      // Auto-unhide if a new message arrives after the user hid it.
      delete nextMeta[conv.id];
      return true;
    }

    return false;
  });

  return { visible, nextMeta };
}

export default function ConversationList({
  currentUserId,
  availablePlayers,
  selectedConversationId,
  onSelectConversation,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [hiddenMeta, setHiddenMeta] = useState<Record<string, string>>({});
  const [hiddenMetaReady, setHiddenMetaReady] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readHiddenMeta();
    setHiddenMeta(stored);
    setHiddenMetaReady(true);
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/messages/conversations");
      if (!response.ok) throw new Error("Failed to load conversations");

      const data = await response.json();
      const rawConversations = (data.conversations || []) as Conversation[];
      const sorted = sortConversations(rawConversations);
      const { visible, nextMeta } = applyHiddenFilter(sorted, hiddenMeta);

      if (hasMetaChanged(hiddenMeta, nextMeta)) {
        setHiddenMeta(nextMeta);
        writeHiddenMeta(nextMeta);
      }

      setConversations(visible);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [hiddenMeta]);

  useEffect(() => {
    if (!hiddenMetaReady) return;
    loadConversations();

    // Subscribe to real-time updates
    const channel = subscribeToConversations(currentUserId, () => {
      console.log("[ConversationList] Realtime update received, reloading...");
      loadConversations();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [currentUserId, hiddenMetaReady, loadConversations]);

  const hideConversation = (conversationId: string) => {
    const hiddenAt = new Date().toISOString();
    const nextMeta = { ...hiddenMeta, [conversationId]: hiddenAt };
    setHiddenMeta(nextMeta);
    writeHiddenMeta(nextMeta);

    setConversations((prev) => {
      const remaining = prev.filter((conv) => conv.id !== conversationId);
      if (selectedConversationId === conversationId && remaining[0]) {
        onSelectConversation(remaining[0].id, remaining[0].otherUser);
      }
      return remaining;
    });
  };

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
      <CardContent className="p-0 flex-1 min-h-0">
        <div className="h-full min-h-0 overflow-y-auto">
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
                <div
                  key={conv.id}
                  onClick={() =>
                    onSelectConversation(conv.id, conv.otherUser)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectConversation(conv.id, conv.otherUser);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className={`w-full p-4 text-left transition-colors border-l-2 border-transparent hover:bg-muted/50 ${
                    selectedConversationId === conv.id
                      ? "bg-primary/10 border-l-primary"
                      : ""
                  } cursor-pointer`}
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
                        <div className="flex items-center gap-1">
                          {conv.lastMessageAt && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTime(conv.lastMessageAt)}
                            </span>
                          )}
                          <button
                            type="button"
                            aria-label="Hide conversation"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              hideConversation(conv.id);
                            }}
                            className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Hide conversation (UI only)"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
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
                </div>
              ))}
            </div>
          )}
        </div>
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
