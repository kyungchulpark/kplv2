"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Target, Users2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderStats {
  player_id: string;
  psn_id: string;
  team_name: string;
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
}

interface LeagueLeadersProps {
  scoringLeaders: LeaderStats[];
  assistLeaders: LeaderStats[];
  reboundLeaders: LeaderStats[];
  seasonName: string;
}

export function LeagueLeaders({
  scoringLeaders,
  assistLeaders,
  reboundLeaders,
  seasonName,
}: LeagueLeadersProps) {
  const colorStyles: Record<
    string,
    { bg: string; border: string; accent: string; solid: string }
  > = {
    orange: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/20",
      accent: "text-orange-500",
      solid: "bg-orange-500",
    },
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      accent: "text-blue-500",
      solid: "bg-blue-500",
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/20",
      accent: "text-green-500",
      solid: "bg-green-500",
    },
  };

  const renderLeaderCard = (
    title: string,
    icon: React.ReactNode,
    leaders: LeaderStats[],
    statKey: "ppg" | "apg" | "rpg",
    statLabel: string,
    color: string
  ) => {
    const style = colorStyles[color] || colorStyles.orange;

    return (
      <Card
        className={cn(
          "border-2 transition-all hover:shadow-lg",
          style.border
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className={cn("p-2 rounded-lg", style.bg)}>
              {icon}
            </div>
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              데이터가 없습니다
            </div>
          ) : (
            <div className="space-y-3">
              {leaders.map((leader, index) => {
                const rank = index + 1;
                const isTopPlayer = rank === 1;

                return (
                  <Link
                    key={leader.player_id}
                    href={`/players/${leader.player_id}`}
                    className="block"
                  >
                    <div
                      className={cn(
                        "flex items-center space-x-3 p-3 rounded-lg transition-all cursor-pointer",
                        isTopPlayer
                          ? cn(style.bg, style.border, "border")
                          : "hover:bg-accent"
                      )}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center min-w-[2rem]">
                        {isTopPlayer ? (
                          <div className={cn("p-1 rounded-full", style.solid)}>
                            <Trophy className="h-4 w-4 text-white" />
                          </div>
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {rank}
                          </span>
                        )}
                      </div>

                      {/* Player Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-nba-red text-white font-bold">
                          {leader.psn_id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {leader.psn_id}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {leader.team_name} · {leader.games_played}경기
                        </p>
                      </div>

                      {/* Stat Value */}
                      <div className="text-right">
                        <p
                          className={cn(
                            "text-2xl font-bold",
                            isTopPlayer ? style.accent : ""
                          )}
                        >
                          {leader[statKey].toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {statLabel}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">리그 리더</h2>
          <p className="text-muted-foreground">
            {seasonName} 주요 기록 상위 5명
          </p>
        </div>
        <Link
          href="/stats"
          className="text-sm text-primary hover:underline flex items-center"
        >
          전체 기록 보기
          <span className="ml-1">→</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Scoring Leaders */}
        {renderLeaderCard(
          "득점왕",
          <Target className="h-5 w-5 text-orange-500" />,
          scoringLeaders,
          "ppg",
          "PPG",
          "orange"
        )}

        {/* Assist Leaders */}
        {renderLeaderCard(
          "어시스트왕",
          <Users2 className="h-5 w-5 text-blue-500" />,
          assistLeaders,
          "apg",
          "APG",
          "blue"
        )}

        {/* Rebound Leaders */}
        {renderLeaderCard(
          "리바운드왕",
          <TrendingUp className="h-5 w-5 text-green-500" />,
          reboundLeaders,
          "rpg",
          "RPG",
          "green"
        )}
      </div>
    </section>
  );
}
