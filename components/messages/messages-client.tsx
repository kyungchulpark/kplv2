"use client";

import { useState, useEffect } from "react";
import ConversationList from "./conversation-list";
import ChatWindow from "./chat-window";
import { Card } from "@/components/ui/card";

interface Player {
  id: string;
  psn_id: string;
  avatar_url: string | null;
  email: string;
}

interface MessagesClientProps {
  currentUserId: string;
  availablePlayers: Player[];
}

export default function MessagesClient({
  currentUserId,
  availablePlayers,
}: MessagesClientProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    psn_id: string;
    avatar_url: string | null;
  } | null>(null);

  const handleSelectConversation = (
    conversationId: string,
    otherUser: { id: string; psn_id: string; avatar_url: string | null }
  ) => {
    setSelectedConversationId(conversationId);
    setSelectedUser(otherUser);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full min-h-0">
      {/* Conversation List (Left) */}
      <Card className="col-span-1 overflow-hidden flex flex-col min-h-0">
        <ConversationList
          currentUserId={currentUserId}
          availablePlayers={availablePlayers}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </Card>

      {/* Chat Window (Right) */}
      <Card className="col-span-1 md:col-span-2 overflow-hidden flex flex-col min-h-0">
        {selectedConversationId && selectedUser ? (
          <ChatWindow
            conversationId={selectedConversationId}
            currentUserId={currentUserId}
            otherUser={selectedUser}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            대화를 선택하거나 새 대화를 시작하세요
          </div>
        )}
      </Card>
    </div>
  );
}
