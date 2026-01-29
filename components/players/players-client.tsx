"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Shield, Search, UserRound } from "lucide-react";
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

export function PlayersClient({
  players,
  isAdmin = false,
}: {
  players: Player[];
  isAdmin?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "team" | "free">("all");

  const filteredPlayers = useMemo(() => {
    return players.filter((player) => {
      const matchesSearch = player.psn_id
        ?.toLowerCase()
        .includes(search.toLowerCase());

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
        <CardTitle>Players</CardTitle>
        <CardDescription>Search and filter</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by PSN ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All players</SelectItem>
              <SelectItem value="team">On a team</SelectItem>
              <SelectItem value="free">Free agent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Players Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlayers.map((player) => (
            <Link key={player.id} href={`/players/${player.id}`}>
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={player.avatar_url || undefined} />
                      <AvatarFallback className="bg-muted">
                        <UserRound className="h-5 w-5 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate">
                          {player.psn_id || "PSN ID"}
                        </p>
                        {player.isCaptain && (
                          <Shield className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        )}
                      </div>
                      {isAdmin && (
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {player.email}
                        </p>
                      )}

                      {player.team ? (
                        <div
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = `/teams/${player.team!.id}`;
                          }}
                          className="flex items-center gap-2 rounded-md bg-muted p-2 hover:bg-muted/80 transition-colors"
                        >
                          {player.team.logo_url ? (
                            <img
                              src={player.team.logo_url}
                              alt={player.team.name}
                              className="h-6 w-6 object-contain"
                              loading="lazy"
                              decoding="async"
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
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Free agent
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredPlayers.length === 0 && (
          <div className="py-6 text-center text-muted-foreground text-sm">
            No players match this filter.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
