"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CardHeader, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import MessageBubble from "./message-bubble";
import {
  subscribeToConversation,
  unsubscribeChannel,
  markConversationAsRead,
} from "@/lib/realtime-helpers";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  sent_at: string;
  sender: {
    id: string;
    psn_id: string;
    avatar_url: string | null;
  };
}

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    psn_id: string;
    avatar_url: string | null;
  };
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  otherUser,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = containerRef.current;
      if (!el) return;
      // Scroll the inner container instead of the whole page.
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior });
      });
    },
    []
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
      if (!response.ok) throw new Error("Failed to load messages");

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const markAsRead = useCallback(async () => {
    try {
      await markConversationAsRead(conversationId, currentUserId);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    loadMessages();
    markAsRead();

    // Subscribe to real-time messages
    const channel = subscribeToConversation(conversationId, (message) => {
      console.log("[ChatWindow] New message received:", message);
      setMessages((prev) => [...prev, message as any]);
      scrollToBottom("smooth");

      // Mark as read if message is from other user
      if (message.sender_id !== currentUserId) {
        markAsRead();
      }
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [conversationId, currentUserId, loadMessages, markAsRead, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();

    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setNewMessage("");
      // Message will be added via real-time subscription
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Header */}
      <CardHeader className="border-b">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={otherUser.avatar_url || undefined} />
            <AvatarFallback>
              {otherUser.psn_id.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{otherUser.psn_id}</h3>
          </div>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 min-h-0 p-4 overflow-hidden">
        <div
          ref={containerRef}
          className="h-full min-h-0 overflow-y-auto pr-4"
        >
          {loading ? (
            <div className="text-center text-muted-foreground">
              메시지 로딩 중...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              대화를 시작하세요
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isFromMe={message.sender_id === currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            disabled={sending}
            maxLength={2000}
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
}
