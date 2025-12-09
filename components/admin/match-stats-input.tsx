"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { StreamUrlInputs } from "@/components/match/stream-url-inputs";
import { NBA2KStyleStatsInput } from "@/components/match/nba2k-style-stats-input";

interface Player {
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  profiles: {
    id: string;
    psn_id: string;
  };
}

interface MatchData {
  id: string;
  season_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  status: string;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string;
  };
  season: {
    id: string;
    name: string;
  };
}

interface PlayerStats {
  player_id: string;
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
}

interface MatchStatsInputProps {
  match: MatchData;
  homeRoster: Player[];
  awayRoster: Player[];
  onSuccessRedirect?: string;
}

export function MatchStatsInput({
  match,
  homeRoster,
  awayRoster,
  onSuccessRedirect = "/admin",
}: MatchStatsInputProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Streaming URLs
  const [homeStreamUrl, setHomeStreamUrl] = useState("");
  const [awayStreamUrl, setAwayStreamUrl] = useState("");

  const calculatePoints = (stats: PlayerStats): number => {
    return (stats.fgm - stats.three_pm) * 2 + stats.three_pm * 3 + stats.ftm;
  };

  const validateStats = (
    homeStats: PlayerStats[],
    awayStats: PlayerStats[]
  ): string[] => {
    const validationErrors: string[] = [];

    if (homeRoster.length < 5) {
      validationErrors.push("홈 팀 활성 로스터가 5명 이상 등록되어 있어야 합니다.");
    }
    if (awayRoster.length < 5) {
      validationErrors.push("원정 팀 활성 로스터가 5명 이상 등록되어 있어야 합니다.");
    }

    // Check if all players are selected
    const allHomeSelected = homeStats.every((s) => s.player_id !== "");
    const allAwaySelected = awayStats.every((s) => s.player_id !== "");

    if (!allHomeSelected) {
      validationErrors.push("홈 팀 5명의 선수를 모두 선택해주세요.");
    }
    if (!allAwaySelected) {
      validationErrors.push("원정 팀 5명의 선수를 모두 선택해주세요.");
    }

    // Check for duplicate players
    const homePlayerIds = homeStats.map((s) => s.player_id).filter(Boolean);
    const awayPlayerIds = awayStats.map((s) => s.player_id).filter(Boolean);

    if (new Set(homePlayerIds).size !== homePlayerIds.length) {
      validationErrors.push("홈 팀에 중복된 선수가 있습니다.");
    }
    if (new Set(awayPlayerIds).size !== awayPlayerIds.length) {
      validationErrors.push("원정 팀에 중복된 선수가 있습니다.");
    }
    const allPlayers = [...homePlayerIds, ...awayPlayerIds];
    if (new Set(allPlayers).size !== allPlayers.length) {
      validationErrors.push("같은 선수가 양 팀에 중복 배치되었습니다.");
    }

    // Validate stats for each player
    [...homeStats, ...awayStats].forEach((stats, idx) => {
      if (!stats.player_id) return;

      const team = idx < 5 ? "홈 팀" : "원정 팀";
      const playerNum = (idx % 5) + 1;

      if (stats.fgm > stats.fga) {
        validationErrors.push(
          `${team} ${playerNum}번 야투 성공(${stats.fgm})이 시도(${stats.fga})보다 많습니다.`
        );
      }
      if (stats.three_pm > stats.three_pa) {
        validationErrors.push(
          `${team} ${playerNum}번 3점슛 성공(${stats.three_pm})이 시도(${stats.three_pa})보다 많습니다.`
        );
      }
      if (stats.ftm > stats.fta) {
        validationErrors.push(
          `${team} ${playerNum}번 자유투 성공(${stats.ftm})이 시도(${stats.fta})보다 많습니다.`
        );
      }
      if (stats.three_pm > stats.fgm) {
        validationErrors.push(
          `${team} ${playerNum}번 3점슛 성공(${stats.three_pm})이 야투 성공(${stats.fgm})보다 많습니다.`
        );
      }

      const calculatedPts = calculatePoints(stats);
      if (stats.pts !== calculatedPts) {
        validationErrors.push(
          `${team} ${playerNum}번 득점(${stats.pts})이 계산값(${calculatedPts})과 다릅니다. 자동으로 보정됩니다.`
        );
      }
    });

    return validationErrors;
  };

  const handleSubmit = async (data: {
    homeScore: number;
    awayScore: number;
    homeStats: PlayerStats[];
    awayStats: PlayerStats[];
  }) => {
    // Validate streaming URLs
    if (!homeStreamUrl || !awayStreamUrl) {
      setErrors(["홈팀과 원정팀 스트리밍 URL을 모두 입력해주세요."]);
      toast.error("스트리밍 URL은 필수 입력입니다");
      return;
    }

    const validationErrors = validateStats(data.homeStats, data.awayStats);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("입력값을 확인해주세요");
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const supabase = createClient();

      // Auto-correct points based on shooting stats
      const correctedHomeStats = data.homeStats.map((s) => ({
        ...s,
        pts: calculatePoints(s),
      }));
      const correctedAwayStats = data.awayStats.map((s) => ({
        ...s,
        pts: calculatePoints(s),
      }));

      // Calculate team scores
      const homeScore = correctedHomeStats.reduce((sum, s) => sum + s.pts, 0);
      const awayScore = correctedAwayStats.reduce((sum, s) => sum + s.pts, 0);

      // Prepare match_stats data (add grade field for DB compatibility)
      const matchStatsData = [
        ...correctedHomeStats.map((stats) => ({
          match_id: match.id,
          team_id: match.home_team_id,
          grade: "", // Empty grade for DB compatibility
          ...stats,
        })),
        ...correctedAwayStats.map((stats) => ({
          match_id: match.id,
          team_id: match.away_team_id,
          grade: "", // Empty grade for DB compatibility
          ...stats,
        })),
      ];

      // Insert match stats
      const { error: statsError } = await supabase
        .from("match_stats")
        .insert(matchStatsData);

      if (statsError) throw statsError;

      // Update match status, scores, and stream URLs
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          status: "finished",
          home_score: homeScore,
          away_score: awayScore,
          home_stream_url: homeStreamUrl,
          away_stream_url: awayStreamUrl,
        })
        .eq("id", match.id);

      if (matchError) throw matchError;

      toast.success("경기 결과가 저장되었습니다.");
      router.push(onSuccessRedirect);
      router.refresh();
    } catch (error: unknown) {
      console.error("Error saving match stats:", error);
      console.error("Error JSON:", JSON.stringify(error, null, 2));

      let errorMessage = "경기 결과 저장 중 오류가 발생했습니다.";
      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };
        if (err.message) {
          errorMessage = `오류: ${err.message}`;
          if (err.details) errorMessage += ` (${err.details})`;
          if (err.hint) errorMessage += ` - 힌트: ${err.hint}`;
          if (err.code) errorMessage += ` [코드: ${err.code}]`;
        }
      }

      setErrors([errorMessage]);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">경기 결과 입력</h1>
        <p className="text-muted-foreground">
          {match.season.name} - {new Date(match.match_date).toLocaleDateString("ko-KR")}
        </p>
        <p className="text-sm text-muted-foreground">
          {match.home_team.name} vs {match.away_team.name}
        </p>
      </div>

      {/* Stream URL Inputs */}
      <StreamUrlInputs
        homeTeamName={match.home_team.name}
        awayTeamName={match.away_team.name}
        onHomeUrlChange={setHomeStreamUrl}
        onAwayUrlChange={setAwayStreamUrl}
      />

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">검증 오류</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* NBA 2K Style Stats Input */}
      <NBA2KStyleStatsInput
        homeTeam={match.home_team}
        awayTeam={match.away_team}
        homeRoster={homeRoster.map((p) => ({
          player_id: p.player_id,
          psn_id: p.profiles.psn_id,
        }))}
        awayRoster={awayRoster.map((p) => ({
          player_id: p.player_id,
          psn_id: p.profiles.psn_id,
        }))}
        onSubmit={handleSubmit}
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          취소
        </Button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg font-semibold">저장 중...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
