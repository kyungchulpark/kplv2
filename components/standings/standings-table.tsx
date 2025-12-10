"use client";

import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  points: number;
  pointsNet: number;
  penalty_points?: number;
  points_for: number;
  points_against: number;
  margin: number;
  ppg: number;
  papg: number;
  is_withdrawn?: boolean;
  recentForm: string[];
}

interface StandingsTableProps {
  teams: Team[];
  conference?: "West" | "East";
}

export function StandingsTable({ teams, conference }: StandingsTableProps) {
  const bgClass =
    conference === "West"
      ? "bg-red-500/5"
      : conference === "East"
      ? "bg-blue-500/5"
      : "bg-neutral-900/10";
  const borderClass =
    conference === "West"
      ? "border-red-500/20"
      : conference === "East"
      ? "border-blue-500/20"
      : "border-neutral-900/20";
  const textClass =
    conference === "West"
      ? "text-red-500"
      : conference === "East"
      ? "text-blue-500"
      : "text-foreground";
  const borderColorClass =
    conference === "West"
      ? "border-red-500"
      : conference === "East"
      ? "border-blue-500"
      : "border-neutral-900/60";
  const bgLightClass =
    conference === "West"
      ? "bg-red-500/10"
      : conference === "East"
      ? "bg-blue-500/10"
      : "bg-neutral-900/20 text-foreground";

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
            <th className="text-left py-3 px-2">Rank</th>
            <th className="text-left py-3 px-2">Team</th>
            <th className="text-center py-3 px-2">GP</th>
            <th className="text-center py-3 px-2">W</th>
            <th className="text-center py-3 px-2">L</th>
            <th className="text-center py-3 px-2">Win%</th>
            <th className="text-center py-3 px-2">Pts</th>
            <th className="text-center py-3 px-2">Penalty</th>
            <th className="text-center py-3 px-2">PPG</th>
            <th className="text-center py-3 px-2">PAPG</th>
            <th className="text-center py-3 px-2">Margin</th>
            <th className="text-left py-3 px-2">Last 5</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, index) => {
            const rank = index + 1;
            const isPlayoffTeam = rank <= 8;

            return (
              <tr
                key={team.id}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50",
                  isPlayoffTeam && `${bgClass} ${borderClass}`
                )}
              >
                {/* Rank */}
                <td className="py-4 px-2">
                  <div className="flex items-center space-x-2">
                    {isPlayoffTeam ? (
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md font-bold",
                          bgLightClass,
                          borderColorClass,
                          textClass,
                          "border"
                        )}
                      >
                        {rank}
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center font-semibold text-muted-foreground">
                        {rank}
                      </div>
                    )}
                    {rank === 1 && <Trophy className="h-4 w-4 text-yellow-500" />}
                  </div>
                </td>

                {/* Team */}
                <td className="py-4 px-2">
                  <div className="flex items-center space-x-3">
                    {team.logo_url ? (
                      <img
                        src={team.logo_url}
                        alt={team.name}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
                        {team.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={cn(
                        "font-semibold",
                        team.is_withdrawn && "line-through text-muted-foreground"
                      )}
                    >
                      {team.name}
                    </span>
                    {team.is_withdrawn && (
                      <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                        (Withdrawn)
                      </span>
                    )}
                  </div>
                </td>

                {/* Games Played */}
                <td className="py-4 px-2 text-center text-muted-foreground">
                  {team.gamesPlayed}
                </td>

                {/* Wins */}
                <td className="py-4 px-2 text-center font-semibold text-green-500">
                  {team.wins}
                </td>

                {/* Losses */}
                <td className="py-4 px-2 text-center font-semibold text-red-500">
                  {team.losses}
                </td>

                {/* Win Rate */}
                <td className="py-4 px-2 text-center font-bold">
                  {team.winRate.toFixed(1)}%
                </td>

                {/* Points */}
                <td className="py-4 px-2 text-center font-bold text-primary">
                  <div className="flex flex-col items-center leading-tight">
                    <span>
                      {Number.isInteger(team.pointsNet)
                        ? team.pointsNet
                        : team.pointsNet.toFixed(1)}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      ({team.points} - {team.penalty_points ?? 0})
                    </span>
                  </div>
                </td>

                {/* Penalty Points */}
                <td className="py-4 px-2 text-center">
                  {team.penalty_points && team.penalty_points > 0 ? (
                    <span className="font-semibold text-red-500">
                      -{team.penalty_points}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                {/* PPG */}
                <td className="py-4 px-2 text-center text-muted-foreground">
                  {team.ppg.toFixed(1)}
                </td>

                {/* PAPG */}
                <td className="py-4 px-2 text-center text-muted-foreground">
                  {team.papg.toFixed(1)}
                </td>

                {/* Margin */}
                <td
                  className={cn(
                    "py-4 px-2 text-center font-semibold",
                    team.margin > 0
                      ? "text-green-500"
                      : team.margin < 0
                      ? "text-red-500"
                      : "text-muted-foreground"
                  )}
                >
                  {team.margin > 0 ? "+" : ""}
                  {team.margin.toFixed(1)}
                </td>

                {/* Recent Form */}
                <td className="py-4 px-2">
                  <div className="flex space-x-1">
                    {team.recentForm.map((result, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
                          result === "W"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        )}
                        title={result === "W" ? "Win" : "Loss"}
                      >
                        {result}
                      </div>
                    ))}
                    {team.recentForm.length < 5 &&
                      Array(5 - team.recentForm.length)
                        .fill(0)
                        .map((_, idx) => (
                          <div
                            key={`empty-${idx}`}
                            className="h-6 w-6 rounded-full bg-muted/30"
                          />
                        ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {teams.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No standings data yet.
        </div>
      )}
    </div>
  );
}
