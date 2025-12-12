"use client";

import { cn } from "@/lib/utils";
import { Trophy, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  conference?: "West" | "East" | null;
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
  showConferenceHighlight?: boolean;
}

type SortField = "gamesPlayed" | "wins" | "losses" | "winRate" | "pointsNet" | "penalty_points" | "ppg" | "papg" | "margin";
type SortDirection = "asc" | "desc" | null;

export function StandingsTable({ teams, conference, showConferenceHighlight = false }: StandingsTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-50 transition-opacity" />;
    }
    if (sortDirection === "desc") {
      return <ArrowDown className="h-3 w-3 ml-1" />;
    }
    return <ArrowUp className="h-3 w-3 ml-1" />;
  };

  const sortedTeams = [...teams].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === "penalty_points") {
      aValue = a.penalty_points ?? 0;
      bValue = b.penalty_points ?? 0;
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  const displayTeams = sortField && sortDirection ? sortedTeams : teams;

  const getConferenceBgClass = (team: Team) => {
    if (!showConferenceHighlight) return "";
    return team.conference === "West"
      ? "bg-red-500/5"
      : team.conference === "East"
      ? "bg-blue-500/5"
      : "";
  };

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
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("gamesPlayed")}
            >
              <div className="flex items-center justify-center">
                GP
                {getSortIcon("gamesPlayed")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("wins")}
            >
              <div className="flex items-center justify-center">
                W
                {getSortIcon("wins")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("losses")}
            >
              <div className="flex items-center justify-center">
                L
                {getSortIcon("losses")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("winRate")}
            >
              <div className="flex items-center justify-center">
                Win%
                {getSortIcon("winRate")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("pointsNet")}
            >
              <div className="flex items-center justify-center">
                Pts
                {getSortIcon("pointsNet")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("penalty_points")}
            >
              <div className="flex items-center justify-center">
                Penalty
                {getSortIcon("penalty_points")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("ppg")}
            >
              <div className="flex items-center justify-center">
                PPG
                {getSortIcon("ppg")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("papg")}
            >
              <div className="flex items-center justify-center">
                PAPG
                {getSortIcon("papg")}
              </div>
            </th>
            <th
              className="text-center py-3 px-2 cursor-pointer hover:text-foreground transition-colors group"
              onClick={() => handleSort("margin")}
            >
              <div className="flex items-center justify-center">
                Margin
                {getSortIcon("margin")}
              </div>
            </th>
            <th className="text-left py-3 px-2">Last 5</th>
          </tr>
        </thead>
        <tbody>
          {displayTeams.map((team, index) => {
            const rank = index + 1;
            const isPlayoffTeam = rank <= 8;

            const teamConferenceBg = getConferenceBgClass(team);
            const isWestPlayoff = showConferenceHighlight && team.conference === "West" && isPlayoffTeam;
            const isEastPlayoff = showConferenceHighlight && team.conference === "East" && isPlayoffTeam;

            return (
              <tr
                key={team.id}
                className={cn(
                  "border-b transition-colors hover:bg-muted/50",
                  teamConferenceBg,
                  isPlayoffTeam && !showConferenceHighlight && `${bgClass} ${borderClass}`,
                  isWestPlayoff && "bg-red-500/5 border-red-500/20",
                  isEastPlayoff && "bg-blue-500/5 border-blue-500/20"
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
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        showConferenceHighlight && team.conference === "West" && isPlayoffTeam && "ring-2 ring-red-500",
                        showConferenceHighlight && team.conference === "East" && isPlayoffTeam && "ring-2 ring-blue-500"
                      )}>
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-8 w-8 object-contain"
                        />
                      </div>
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

      {displayTeams.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          No standings data yet.
        </div>
      )}
    </div>
  );
}
