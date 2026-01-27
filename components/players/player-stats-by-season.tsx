"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Activity, Calendar } from "lucide-react";
import Link from "next/link";

interface Season {
  id: string;
  name: string;
}

interface MatchStat {
  id: string;
  team_id?: string | null;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  grade: string | null;
  created_at: string;
  match: {
    id: string;
    match_date: string;
    season_id: string;
    home_team: { name: string; id: string };
    away_team: { name: string; id: string };
  };
}

interface PlayerStatsBySeasonProps {
  seasons: Season[];
  stats: MatchStat[];
  teamId?: string;
  teamName?: string;
}

export function PlayerStatsBySeason({
  seasons,
  stats,
  teamId,
  teamName,
}: PlayerStatsBySeasonProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>(
    seasons[0]?.id || "all"
  );

  // Filter stats by selected season
  const filteredStats =
    selectedSeasonId === "all"
      ? stats
      : stats.filter((stat) => stat.match.season_id === selectedSeasonId);

  // Calculate averages for filtered stats
  const totalGames = filteredStats.length;
  const averages = filteredStats.reduce(
    (acc, curr) => ({
      pts: acc.pts + curr.pts,
      reb: acc.reb + curr.reb,
      ast: acc.ast + curr.ast,
      stl: acc.stl + curr.stl,
      blk: acc.blk + curr.blk,
    }),
    { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
  );

  if (totalGames > 0) {
    averages.pts = Number((averages.pts / totalGames).toFixed(1));
    averages.reb = Number((averages.reb / totalGames).toFixed(1));
    averages.ast = Number((averages.ast / totalGames).toFixed(1));
    averages.stl = Number((averages.stl / totalGames).toFixed(1));
    averages.blk = Number((averages.blk / totalGames).toFixed(1));
  }

  return (
    <div className="space-y-6">
      {/* Season Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Season Stats
            </CardTitle>
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Seasons</SelectItem>
                {seasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {totalGames > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{averages.pts}</div>
                <div className="text-xs text-muted-foreground font-semibold">PPG</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{averages.reb}</div>
                <div className="text-xs text-muted-foreground font-semibold">RPG</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{averages.ast}</div>
                <div className="text-xs text-muted-foreground font-semibold">APG</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{averages.stl}</div>
                <div className="text-xs text-muted-foreground font-semibold">SPG</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{averages.blk}</div>
                <div className="text-xs text-muted-foreground font-semibold">BPG</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No stats for selected season
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Games */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Games ({totalGames})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStats.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No game records found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Date/Opponent</th>
                    <th className="text-center px-2">PTS</th>
                    <th className="text-center px-2">REB</th>
                    <th className="text-center px-2">AST</th>
                    <th className="text-center px-2">STL</th>
                    <th className="text-center px-2">BLK</th>
                    <th className="text-center px-2">FG</th>
                    <th className="text-center px-2">3P</th>
                    <th className="text-center px-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStats.map((stat) => (
                    <tr key={stat.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="font-medium">
                          {new Date(stat.match.match_date).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          vs{" "}
                          {(() => {
                            const playerTeamId = stat.team_id || teamId;
                            if (playerTeamId && stat.match.home_team.id === playerTeamId) {
                              return stat.match.away_team.name;
                            }
                            return stat.match.home_team.name;
                          })()}
                        </div>
                      </td>
                      <td className="text-center font-bold">{stat.pts}</td>
                      <td className="text-center">{stat.reb}</td>
                      <td className="text-center">{stat.ast}</td>
                      <td className="text-center">{stat.stl}</td>
                      <td className="text-center">{stat.blk}</td>
                      <td className="text-center text-xs">
                        {stat.fgm}/{stat.fga}
                      </td>
                      <td className="text-center text-xs">
                        {stat.three_pm}/{stat.three_pa}
                      </td>
                      <td className="text-center">
                        {stat.grade ? (
                          <Badge variant="outline" className="text-xs">
                            {stat.grade}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
