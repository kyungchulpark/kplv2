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
import { Calendar, Clock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { YouTubeEmbed } from "@/components/match/youtube-embed";
import Link from "next/link";

interface Match {
  id: string;
  match_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_stream_url?: string | null;
  away_stream_url?: string | null;
  result_screenshot_url?: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference?: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference?: string | null;
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

  const renderTeamInfo = (team: Match["home_team"], score: number | null, isWinner: boolean) => (
    <div className="text-center space-y-2">
      <Link href={`/teams/${team.id}`} className="block hover:opacity-80 transition-opacity">
        {team.logo_url ? (
          <img
            src={team.logo_url}
            alt={team.name}
            className="h-16 w-16 object-contain mx-auto"
          />
        ) : (
          <div className="h-16 w-16 mx-auto rounded-lg bg-nba-red flex items-center justify-center text-xl font-bold text-white">
            {team.name.substring(0, 2)}
          </div>
        )}
        <h3 className="font-bold mt-2">{team.name}</h3>
      </Link>
      {match.status === "finished" && (
        <div
          className={cn(
            "text-4xl font-bold",
            isWinner ? "text-primary" : "text-muted-foreground"
          )}
        >
          {score}
        </div>
      )}
    </div>
  );

  const renderStatsTable = (teamStats: MatchStats[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[600px]">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 sticky left-0 bg-background z-10 w-32">선수</th>
            <th className="text-center w-12">PTS</th>
            <th className="text-center w-12">REB</th>
            <th className="text-center w-12">AST</th>
            <th className="text-center w-12">STL</th>
            <th className="text-center w-12">BLK</th>
            <th className="text-center w-16">FG</th>
            <th className="text-center w-16">3P</th>
            <th className="text-center w-16">FT</th>
            <th className="text-center w-12">TO</th>
            <th className="text-center w-12">FLS</th>
          </tr>
        </thead>
        <tbody>
          {teamStats.map((stat, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/50">
              <td className="py-2 font-medium sticky left-0 bg-background z-10">
                <Link href={`/players/${stat.player_id}`} className="hover:underline text-primary">
                  {stat.player.psn_id}
                </Link>
              </td>
              <td className="text-center font-semibold">{stat.pts}</td>
              <td className="text-center">{stat.reb}</td>
              <td className="text-center">{stat.ast}</td>
              <td className="text-center">{stat.stl}</td>
              <td className="text-center">{stat.blk}</td>
              <td className="text-center text-xs text-muted-foreground">
                {stat.fgm}/{stat.fga}
              </td>
              <td className="text-center text-xs text-muted-foreground">
                {stat.three_pm}/{stat.three_pa}
              </td>
              <td className="text-center text-xs text-muted-foreground">
                {stat.ftm}/{stat.fta}
              </td>
              <td className="text-center">{stat.turnovers}</td>
              <td className="text-center">{stat.fls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

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
              {renderTeamInfo(
                match.home_team,
                match.home_score,
                (match.home_score || 0) > (match.away_score || 0)
              )}

              {/* VS */}
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">VS</div>
              </div>

              {/* Away Team */}
              {renderTeamInfo(
                match.away_team,
                match.away_score,
                (match.away_score || 0) > (match.home_score || 0)
              )}
            </div>
          </CardContent>
        </Card>

        {/* Match Stats (if finished) */}
        {match.status === "finished" && stats && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">경기 기록</h3>

            {/* Home Team Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{match.home_team.name}</h4>
                <Link href={`/teams/${match.home_team.id}`} className="text-xs text-muted-foreground hover:underline">
                  팀 정보 &rarr;
                </Link>
              </div>
              {renderStatsTable(homeStats)}
            </div>

            {/* Away Team Stats */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold">{match.away_team.name}</h4>
                <Link href={`/teams/${match.away_team.id}`} className="text-xs text-muted-foreground hover:underline">
                  팀 정보 &rarr;
                </Link>
              </div>
              {renderStatsTable(awayStats)}
            </div>
          </div>
        )}

        {/* Streaming & Screenshot (if finished) */}
        {match.status === "finished" && (match.home_stream_url || match.away_stream_url || match.result_screenshot_url) && (
          <div className="space-y-6 mt-6 border-t pt-6">
            {/* Screenshot */}
            {match.result_screenshot_url && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">경기 결과 스크린샷</h3>
                <img
                  src={match.result_screenshot_url}
                  alt="Match result screenshot"
                  className="w-full rounded-lg border"
                />
              </div>
            )}

            {/* Streaming Videos */}
            {(match.home_stream_url || match.away_stream_url) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">경기 스트리밍</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {match.home_stream_url && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">
                        {match.home_team.name} (홈)
                      </h4>
                      <YouTubeEmbed
                        url={match.home_stream_url}
                        title={`${match.home_team.name} Stream`}
                      />
                    </div>
                  )}
                  {match.away_stream_url && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">
                        {match.away_team.name} (원정)
                      </h4>
                      <YouTubeEmbed
                        url={match.away_stream_url}
                        title={`${match.away_team.name} Stream`}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
