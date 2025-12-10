"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, ArrowUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlayerStatRow = {
  player_id: string;
  psn_id: string;
  avatar_url: string | null;
  team_id: string | null;
  team_name: string;
  team_logo_url: string | null;
  games_played: number;
  grade?: string | null;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fls: number;
  turnovers: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
};

type SortKey = keyof PlayerStatRow;
type SortDir = "asc" | "desc";

const columns: Array<{ key: SortKey; label: string; width?: string }> = [
  { key: "psn_id", label: "Player", width: "min-w-[160px]" },
  { key: "team_name", label: "Team", width: "min-w-[140px]" },
  { key: "games_played", label: "GP" },
  { key: "pts", label: "PTS" },
  { key: "reb", label: "REB" },
  { key: "ast", label: "AST" },
  { key: "stl", label: "STL" },
  { key: "blk", label: "BLK" },
  { key: "fls", label: "FLS" },
  { key: "turnovers", label: "TO" },
  { key: "fgm", label: "FGM" },
  { key: "fga", label: "FGA" },
  { key: "three_pm", label: "3PM" },
  { key: "three_pa", label: "3PA" },
  { key: "ftm", label: "FTM" },
  { key: "fta", label: "FTA" },
];

export function StatsTable({ rows }: { rows: PlayerStatRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("pts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const perGameKeys: Set<SortKey> = new Set([
    "pts",
    "reb",
    "ast",
    "stl",
    "blk",
    "fls",
    "turnovers",
    "fgm",
    "fga",
    "three_pm",
    "three_pa",
    "ftm",
    "fta",
  ]);

  const getSortableValue = (row: PlayerStatRow, key: SortKey) => {
    const raw = row[key] as any;
    if (perGameKeys.has(key)) {
      const games = row.games_played || 0;
      return games > 0 ? Number(raw || 0) / games : 0;
    }
    return raw ?? 0;
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aVal = getSortableValue(a, sortKey);
      const bVal = getSortableValue(b, sortKey);
      if (sortDir === "asc") return Number(aVal) - Number(bVal);
      return Number(bVal) - Number(aVal);
    });
  }, [rows, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="h-3.5 w-3.5" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const formatStat = (row: PlayerStatRow, key: SortKey) => {
    const value = row[key] as any;
    if (!perGameKeys.has(key)) return value;

    const games = row.games_played || 0;
    if (games === 0) return 0;

    const avg = Number(value || 0) / games;
    // 2寃쎄린 ?댁긽?대㈃ ?됯퇏, ?꾨땲硫??먭컪
    return games >= 2 ? avg.toFixed(1) : Number(value || 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Player Stats (by match results)</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground w-[40px]">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground whitespace-nowrap",
                    col.width
                  )}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1"
                    onClick={() => toggleSort(col.key)}
                  >
                    {col.label}
                    {sortIcon(col.key)}
                  </Button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-muted-foreground" colSpan={columns.length + 1}>
                  No stats yet.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, idx) => (
                <tr key={row.player_id} className="border-b hover:bg-muted/40">
                  <td className="px-3 py-2 text-center text-muted-foreground">{idx + 1}</td>
                  {/* Player */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={row.avatar_url || undefined} />
                        <AvatarFallback className="bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{row.psn_id}</div>
                      </div>
                    </div>
                  </td>
                  {/* Team */}
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {row.team_logo_url ? (
                        <img src={row.team_logo_url} alt={row.team_name} className="h-6 w-6 object-contain" />
                      ) : (
                        <div className="h-6 w-6 rounded bg-nba-red flex items-center justify-center text-[10px] font-bold text-white">
                          {row.team_name.substring(0, 2)}
                        </div>
                      )}
                      <span className="truncate">{row.team_name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">{row.games_played}</td>
                  <td className="px-3 py-2 text-center font-semibold">
                    {formatStat(row, "pts")}
                  </td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "reb")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "ast")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "stl")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "blk")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "fls")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "turnovers")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "fgm")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "fga")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "three_pm")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "three_pa")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "ftm")}</td>
                  <td className="px-3 py-2 text-center">{formatStat(row, "fta")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
