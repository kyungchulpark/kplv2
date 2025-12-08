"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Shield, Search } from "lucide-react";
import Link from "next/link";

interface Player {
  id: string;
  psn_id: string;
  email: string;
  avatar_url: string | null;
  role: string;
  created_at: string;
  team: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  isCaptain: boolean;
}

export function PlayersClient({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "team" | "free">("all");

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      // Search filter
      const matchesSearch =
        player.psn_id?.toLowerCase().includes(search.toLowerCase()) ||
        player.email?.toLowerCase().includes(search.toLowerCase());

      // Team filter
      const matchesFilter =
        filter === "all" ||
        (filter === "team" && player.team) ||
        (filter === "free" && !player.team);

      return matchesSearch && matchesFilter;
    });
  }, [players, search, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>선수 목록</CardTitle>
        <CardDescription>검색 및 필터링</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="PSN ID 또는 이메일 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 선수</SelectItem>
              <SelectItem value="team">팀 소속</SelectItem>
              <SelectItem value="free">자유 계약</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Players Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Card key={player.id} className="hover:bg-accent transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={player.avatar_url || undefined} />
                    <AvatarFallback>
                      {player.psn_id?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold truncate">
                        {player.psn_id || "PSN ID 없음"}
                      </p>
                      {player.isCaptain && (
                        <Shield className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {player.email}
                    </p>

                    {player.team ? (
                      <Link href={`/teams/${player.team.id}`}>
                        <div className="flex items-center gap-2 rounded-md bg-muted p-2 hover:bg-muted/80 transition-colors">
                          {player.team.logo_url ? (
                            <img
                              src={player.team.logo_url}
                              alt={player.team.name}
                              className="h-6 w-6 object-contain"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center text-xs font-bold">
                              {player.team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="text-xs font-medium truncate">
                            {player.team.name}
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        자유 계약
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>검색 결과가 없습니다</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
