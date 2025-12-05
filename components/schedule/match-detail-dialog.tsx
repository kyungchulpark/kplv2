"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
}

interface MatchStats {
  player_id: string;
  team_id: string;
  grade: string | null;
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
  player: {
    psn_id: string;
  };
}

interface MatchDetailDialogProps {
  match: Match;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchDetailDialog({ match, open, onOpenChange }: MatchDetailDialogProps) {
  const [stats, setStats] = useState<MatchStats[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && match.status === "finished") {
      loadMatchStats();
    }
  }, [open, match.id]);

  const loadMatchStats = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("match_stats")
      .select(
        `
        *,
        player:profiles!match_stats_player_id_fkey(psn_id)
      `
      )
      .eq("match_id", match.id)
      .order("pts", { ascending: false });

    setStats(data as unknown as MatchStats[]);
    setLoading(false);
  };

  const matchDate = new Date(match.match_date);
  const homeStats = stats?.filter((s) => s.team_id === match.home_team.id) || [];
  const awayStats = stats?.filter((s) => s.team_id === match.away_team.id) || [];

  const getStatusBadge = () => {
    switch (match.status) {
      case "live":
        return <Badge className="bg-red-500 animate-pulse">LIVE</Badge>;
      case "finished":
        return <Badge variant="secondary">종료</Badge>;
      case "scheduled":
        return <Badge variant="outline">예정</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>경기 상세</span>
            {getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{matchDate.toLocaleDateString("ko-KR")}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>
                  {matchDate.toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        {/* Scoreboard */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Home Team */}
              <div className="text-center space-y-2">
                {match.home_team.logo_url ? (
                  <img
                    src={match.home_team.logo_url}
                    alt={match.home_team.name}
                    className="h-16 w-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="h-16 w-16 mx-auto rounded-lg bg-nba-red flex items-center justify-center text-xl font-bold text-white">
                    {match.home_team.name.substring(0, 2)}
                  </div>
                )}
                <h3 className="font-bold">{match.home_team.name}</h3>
                {match.status === "finished" && (
                  <div
                    className={cn(
                      "text-4xl font-bold",
                      match.home_score! > match.away_score!
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {match.home_score}
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
              </div>

              {/* Away Team */}
              <div className="text-center space-y-2">
                {match.away_team.logo_url ? (
                  <img
                    src={match.away_team.logo_url}
                    alt={match.away_team.name}
                    className="h-16 w-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="h-16 w-16 mx-auto rounded-lg bg-nba-red flex items-center justify-center text-xl font-bold text-white">
                    {match.away_team.name.substring(0, 2)}
                  </div>
                )}
                <h3 className="font-bold">{match.away_team.name}</h3>
                {match.status === "finished" && (
                  <div
                    className={cn(
                      "text-4xl font-bold",
                      match.away_score! > match.home_score!
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {match.away_score}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Stats (if finished) */}
        {match.status === "finished" && stats && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">경기 기록</h3>

            {/* Home Team Stats */}
            <div>
              <h4 className="font-semibold mb-2">{match.home_team.name}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">선수</th>
                      <th className="text-center">PTS</th>
                      <th className="text-center">REB</th>
                      <th className="text-center">AST</th>
                      <th className="text-center">FG</th>
                      <th className="text-center">3P</th>
                      <th className="text-center">FT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homeStats.map((stat, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 font-medium">{stat.player.psn_id}</td>
                        <td className="text-center">{stat.pts}</td>
                        <td className="text-center">{stat.reb}</td>
                        <td className="text-center">{stat.ast}</td>
                        <td className="text-center text-xs">
                          {stat.fgm}/{stat.fga}
                        </td>
                        <td className="text-center text-xs">
                          {stat.three_pm}/{stat.three_pa}
                        </td>
                        <td className="text-center text-xs">
                          {stat.ftm}/{stat.fta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Away Team Stats */}
            <div>
              <h4 className="font-semibold mb-2">{match.away_team.name}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">선수</th>
                      <th className="text-center">PTS</th>
                      <th className="text-center">REB</th>
                      <th className="text-center">AST</th>
                      <th className="text-center">FG</th>
                      <th className="text-center">3P</th>
                      <th className="text-center">FT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awayStats.map((stat, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-2 font-medium">{stat.player.psn_id}</td>
                        <td className="text-center">{stat.pts}</td>
                        <td className="text-center">{stat.reb}</td>
                        <td className="text-center">{stat.ast}</td>
                        <td className="text-center text-xs">
                          {stat.fgm}/{stat.fga}
                        </td>
                        <td className="text-center text-xs">
                          {stat.three_pm}/{stat.three_pa}
                        </td>
                        <td className="text-center text-xs">
                          {stat.ftm}/{stat.fta}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
