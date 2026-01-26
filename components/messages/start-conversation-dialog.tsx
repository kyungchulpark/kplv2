"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface Player {
  id: string;
  psn_id: string;
  avatar_url: string | null;
  email: string;
}

interface StartConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  onSelectPlayer: (playerId: string) => void;
}

export default function StartConversationDialog({
  open,
  onOpenChange,
  players,
  onSelectPlayer,
}: StartConversationDialogProps) {
  const [search, setSearch] = useState("");

  const filteredPlayers = players.filter((player) =>
    player.psn_id.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (playerId: string) => {
    onSelectPlayer(playerId);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 대화 시작</DialogTitle>
          <DialogDescription>
            대화할 선수를 선택하세요
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="선수 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ScrollArea className="h-[300px] border rounded-md">
            {filteredPlayers.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                선수를 찾을 수 없습니다
              </div>
            ) : (
              <div className="divide-y">
                {filteredPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleSelect(player.id)}
                    className="w-full p-3 hover:bg-accent transition-colors text-left flex items-center gap-3"
                  >
                    <Avatar>
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback>
                        {player.psn_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{player.psn_id}</p>
                      <p className="text-sm text-muted-foreground">
                        {player.email}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
