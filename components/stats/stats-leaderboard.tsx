"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";

interface PlayerStat {
  player_id: string;
  team_id: string;
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  fg_pct: number;
  three_p_pct: number;
  ft_pct: number;
  total_pts: number;
  total_reb: number;
  total_ast: number;
  total_stl: number;
  total_blk: number;
  profile: {
    psn_id: string;
    avatar_url: string | null;
  };
  team: {
    name: string;
    logo_url: string | null;
  };
}

interface StatsLeaderboardProps {
  stats: PlayerStat[];
}

type StatCategory = {
  key: keyof PlayerStat;
  label: string;
  displayKey: keyof PlayerStat;
  format: (value: number) => string;
  minGames?: number;
};

const STAT_CATEGORIES: StatCategory[] = [
  {
    key: "ppg",
    label: "득점",
    displayKey: "ppg",
    format: (v) => v.toFixed(1),
  },
  {
    key: "rpg",
    label: "리바운드",
    displayKey: "rpg",
    format: (v) => v.toFixed(1),
  },
  {
    key: "apg",
    label: "어시스트",
    displayKey: "apg",
    format: (v) => v.toFixed(1),
  },
  {
    key: "spg",
    label: "스틸",
    displayKey: "spg",
    format: (v) => v.toFixed(1),
  },
  {
    key: "bpg",
    label: "블록",
    displayKey: "bpg",
    format: (v) => v.toFixed(1),
  },
  {
    key: "fg_pct",
    label: "야투율",
    displayKey: "fg_pct",
    format: (v) => `${v.toFixed(1)}%`,
    minGames: 3,
  },
  {
    key: "three_p_pct",
    label: "3점슛",
    displayKey: "three_p_pct",
    format: (v) => `${v.toFixed(1)}%`,
    minGames: 3,
  },
  {
    key: "ft_pct",
    label: "자유투",
    displayKey: "ft_pct",
    format: (v) => `${v.toFixed(1)}%`,
    minGames: 3,
  },
];

export function StatsLeaderboard({ stats }: StatsLeaderboardProps) {
  const [activeCategory, setActiveCategory] = useState<string>("ppg");

  const getRankedPlayers = (category: StatCategory) => {
    let filteredStats = [...stats];

    // Apply minimum games filter for percentage stats
    if (category.minGames) {
      filteredStats = filteredStats.filter((s) => s.games_played >= category.minGames);
    }

    // Sort by the category
    return filteredStats.sort((a, b) => {
      const aVal = a[category.key] as number;
      const bVal = b[category.key] as number;
      return bVal - aVal;
    });
  };

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-500";
      case 2:
        return "text-gray-400";
      case 3:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>개인 기록 순위</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid grid-cols-4 lg:grid-cols-8 w-full">
            {STAT_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {STAT_CATEGORIES.map((category) => {
            const rankedPlayers = getRankedPlayers(category);

            return (
              <TabsContent key={category.key} value={category.key} className="mt-6">
                <div className="space-y-2">
                  {/* Header Row */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold border-b">
                    <div className="col-span-1 text-center">순위</div>
                    <div className="col-span-5">선수</div>
                    <div className="col-span-3">팀</div>
                    <div className="col-span-2 text-center">{category.label}</div>
                    <div className="col-span-1 text-center">GP</div>
                  </div>

                  {/* Player Rows */}
                  {rankedPlayers.length > 0 ? (
                    rankedPlayers.map((player, idx) => {
                      const rank = idx + 1;
                      const statValue = player[category.displayKey] as number;

                      return (
                        <div
                          key={player.player_id}
                          className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-accent rounded-lg transition-colors"
                        >
                          {/* Rank */}
                          <div className="col-span-1 text-center">
                            {rank <= 3 ? (
                              <Trophy className={`h-5 w-5 mx-auto ${getMedalColor(rank)}`} />
                            ) : (
                              <span className="text-muted-foreground font-semibold">{rank}</span>
                            )}
                          </div>

                          {/* Player */}
                          <div className="col-span-5 flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={player.profile.avatar_url || undefined} />
                              <AvatarFallback>
                                {player.profile.psn_id.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">{player.profile.psn_id}</p>
                            </div>
                          </div>

                          {/* Team */}
                          <div className="col-span-3 flex items-center space-x-2">
                            {player.team.logo_url ? (
                              <img
                                src={player.team.logo_url}
                                alt={player.team.name}
                                className="h-6 w-6 object-contain"
                              />
                            ) : (
                              <div className="h-6 w-6 rounded bg-nba-red flex items-center justify-center text-[10px] font-bold text-white">
                                {player.team.name.substring(0, 2)}
                              </div>
                            )}
                            <span className="text-sm truncate">{player.team.name}</span>
                          </div>

                          {/* Stat Value */}
                          <div className="col-span-2 text-center">
                            <Badge
                              variant={rank <= 3 ? "default" : "secondary"}
                              className="text-base font-bold"
                            >
                              {category.format(statValue)}
                            </Badge>
                          </div>

                          {/* Games Played */}
                          <div className="col-span-1 text-center text-sm text-muted-foreground">
                            {player.games_played}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      기록이 없습니다
                    </div>
                  )}
                </div>

                {/* Minimum Games Note */}
                {category.minGames && (
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    * 최소 {category.minGames}경기 이상 출전한 선수만 표시됩니다
                  </p>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
