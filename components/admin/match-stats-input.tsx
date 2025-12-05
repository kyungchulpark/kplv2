"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

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
  grade: string;
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
}

const emptyStats: Omit<PlayerStats, "player_id"> = {
  grade: "",
  pts: 0,
  reb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  fls: 0,
  turnovers: 0,
  fgm: 0,
  fga: 0,
  three_pm: 0,
  three_pa: 0,
  ftm: 0,
  fta: 0,
};

export function MatchStatsInput({
  match,
  homeRoster,
  awayRoster,
}: MatchStatsInputProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [homeStats, setHomeStats] = useState<PlayerStats[]>(
    Array(5)
      .fill(null)
      .map(() => ({ player_id: "", ...emptyStats }))
  );

  const [awayStats, setAwayStats] = useState<PlayerStats[]>(
    Array(5)
      .fill(null)
      .map(() => ({ player_id: "", ...emptyStats }))
  );

  const updateHomePlayer = (index: number, playerId: string) => {
    const newStats = [...homeStats];
    newStats[index] = { ...newStats[index], player_id: playerId };
    setHomeStats(newStats);
  };

  const updateAwayPlayer = (index: number, playerId: string) => {
    const newStats = [...awayStats];
    newStats[index] = { ...newStats[index], player_id: playerId };
    setAwayStats(newStats);
  };

  const updateHomeStat = (
    index: number,
    field: keyof Omit<PlayerStats, "player_id">,
    value: string | number
  ) => {
    const newStats = [...homeStats];
    newStats[index] = {
      ...newStats[index],
      [field]: typeof value === "string" ? value : Number(value),
    };
    setHomeStats(newStats);
  };

  const updateAwayStat = (
    index: number,
    field: keyof Omit<PlayerStats, "player_id">,
    value: string | number
  ) => {
    const newStats = [...awayStats];
    newStats[index] = {
      ...newStats[index],
      [field]: typeof value === "string" ? value : Number(value),
    };
    setAwayStats(newStats);
  };

  const calculatePoints = (stats: PlayerStats): number => {
    return (stats.fgm - stats.three_pm) * 2 + stats.three_pm * 3 + stats.ftm;
  };

  const validateStats = (): string[] => {
    const validationErrors: string[] = [];

    // Check if all players are selected
    const allHomeSelected = homeStats.every((s) => s.player_id !== "");
    const allAwaySelected = awayStats.every((s) => s.player_id !== "");

    if (!allHomeSelected) {
      validationErrors.push("홈팀 5명의 선수를 모두 선택해주세요.");
    }
    if (!allAwaySelected) {
      validationErrors.push("원정팀 5명의 선수를 모두 선택해주세요.");
    }

    // Check for duplicate players
    const homePlayerIds = homeStats.map((s) => s.player_id).filter(Boolean);
    const awayPlayerIds = awayStats.map((s) => s.player_id).filter(Boolean);

    if (new Set(homePlayerIds).size !== homePlayerIds.length) {
      validationErrors.push("홈팀에 중복된 선수가 있습니다.");
    }
    if (new Set(awayPlayerIds).size !== awayPlayerIds.length) {
      validationErrors.push("원정팀에 중복된 선수가 있습니다.");
    }

    // Validate stats for each player
    [...homeStats, ...awayStats].forEach((stats, idx) => {
      if (!stats.player_id) return;

      const team = idx < 5 ? "홈팀" : "원정팀";
      const playerNum = (idx % 5) + 1;

      if (stats.fgm > stats.fga) {
        validationErrors.push(
          `${team} ${playerNum}번: 야투 성공(${stats.fgm})이 시도(${stats.fga})보다 많습니다.`
        );
      }
      if (stats.three_pm > stats.three_pa) {
        validationErrors.push(
          `${team} ${playerNum}번: 3점슛 성공(${stats.three_pm})이 시도(${stats.three_pa})보다 많습니다.`
        );
      }
      if (stats.ftm > stats.fta) {
        validationErrors.push(
          `${team} ${playerNum}번: 자유투 성공(${stats.ftm})이 시도(${stats.fta})보다 많습니다.`
        );
      }
      if (stats.three_pm > stats.fgm) {
        validationErrors.push(
          `${team} ${playerNum}번: 3점슛 성공(${stats.three_pm})이 야투 성공(${stats.fgm})보다 많습니다.`
        );
      }

      const calculatedPts = calculatePoints(stats);
      if (stats.pts !== calculatedPts) {
        validationErrors.push(
          `${team} ${playerNum}번: 득점(${stats.pts})이 계산값(${calculatedPts})과 다릅니다. 자동으로 수정됩니다.`
        );
      }
    });

    return validationErrors;
  };

  const handleSave = async () => {
    const validationErrors = validateStats();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    setErrors([]);

    try {
      const supabase = createClient();

      // Auto-correct points based on shooting stats
      const correctedHomeStats = homeStats.map((s) => ({
        ...s,
        pts: calculatePoints(s),
      }));
      const correctedAwayStats = awayStats.map((s) => ({
        ...s,
        pts: calculatePoints(s),
      }));

      // Calculate team scores
      const homeScore = correctedHomeStats.reduce((sum, s) => sum + s.pts, 0);
      const awayScore = correctedAwayStats.reduce((sum, s) => sum + s.pts, 0);

      // Prepare match_stats data
      const matchStatsData = [
        ...correctedHomeStats.map((stats) => ({
          match_id: match.id,
          team_id: match.home_team_id,
          ...stats,
        })),
        ...correctedAwayStats.map((stats) => ({
          match_id: match.id,
          team_id: match.away_team_id,
          ...stats,
        })),
      ];

      // Insert match stats
      const { error: statsError } = await supabase
        .from("match_stats")
        .insert(matchStatsData);

      if (statsError) throw statsError;

      // Update match status and scores
      const { error: matchError } = await supabase
        .from("matches")
        .update({
          status: "finished",
          home_score: homeScore,
          away_score: awayScore,
        })
        .eq("id", match.id);

      if (matchError) throw matchError;

      // Redirect to match detail or admin page
      router.push(`/admin`);
      router.refresh();
    } catch (error) {
      console.error("Error saving match stats:", error);
      setErrors(["경기 결과 저장 중 오류가 발생했습니다."]);
      setIsLoading(false);
    }
  };

  const homeScore = homeStats.reduce((sum, s) => sum + s.pts, 0);
  const awayScore = awayStats.reduce((sum, s) => sum + s.pts, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">경기 결과 입력</h1>
        <p className="text-muted-foreground">
          {match.season.name} - {new Date(match.match_date).toLocaleDateString("ko-KR")}
        </p>
      </div>

      {/* Scoreboard */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 items-center">
            {/* Home Team */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                {match.home_team.logo_url && (
                  <img
                    src={match.home_team.logo_url}
                    alt={match.home_team.name}
                    className="h-12 w-12 object-contain"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold">{match.home_team.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {match.home_team.conference}
                  </p>
                </div>
              </div>
              <div className="text-5xl font-bold text-primary">{homeScore}</div>
            </div>

            {/* VS */}
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">VS</div>
            </div>

            {/* Away Team */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div>
                  <h2 className="text-2xl font-bold">{match.away_team.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {match.away_team.conference}
                  </p>
                </div>
                {match.away_team.logo_url && (
                  <img
                    src={match.away_team.logo_url}
                    alt={match.away_team.name}
                    className="h-12 w-12 object-contain"
                  />
                )}
              </div>
              <div className="text-5xl font-bold text-primary">{awayScore}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertCircle className="mr-2 h-5 w-5" />
              검증 오류
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Stats Input */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Home Team Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{match.home_team.name}</span>
              <span className="text-sm font-normal text-muted-foreground">(홈)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatsInputTable
              roster={homeRoster}
              stats={homeStats}
              onPlayerChange={updateHomePlayer}
              onStatChange={updateHomeStat}
            />
          </CardContent>
        </Card>

        {/* Away Team Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>{match.away_team.name}</span>
              <span className="text-sm font-normal text-muted-foreground">(원정)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatsInputTable
              roster={awayRoster}
              stats={awayStats}
              onPlayerChange={updateAwayPlayer}
              onStatChange={updateAwayStat}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          취소
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              경기 종료
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

interface StatsInputTableProps {
  roster: Player[];
  stats: PlayerStats[];
  onPlayerChange: (index: number, playerId: string) => void;
  onStatChange: (
    index: number,
    field: keyof Omit<PlayerStats, "player_id">,
    value: string | number
  ) => void;
}

function StatsInputTable({
  roster,
  stats,
  onPlayerChange,
  onStatChange,
}: StatsInputTableProps) {
  return (
    <div className="space-y-4">
      {stats.map((playerStats, index) => (
        <div key={index} className="space-y-3 border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">선수 {index + 1}</Label>
            <Select
              value={playerStats.player_id}
              onValueChange={(value) => onPlayerChange(index, value)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="선수 선택" />
              </SelectTrigger>
              <SelectContent>
                {roster.map((player) => (
                  <SelectItem key={player.player_id} value={player.player_id}>
                    {player.profiles.psn_id}
                    {player.jersey_number && ` #${player.jersey_number}`}
                    {player.position && ` (${player.position})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {playerStats.player_id && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label className="text-xs">Grade</Label>
                <Input
                  type="text"
                  placeholder="A+"
                  value={playerStats.grade}
                  onChange={(e) => onStatChange(index, "grade", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">PTS</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.pts}
                  onChange={(e) =>
                    onStatChange(index, "pts", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">REB</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.reb}
                  onChange={(e) =>
                    onStatChange(index, "reb", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">AST</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.ast}
                  onChange={(e) =>
                    onStatChange(index, "ast", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">STL</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.stl}
                  onChange={(e) =>
                    onStatChange(index, "stl", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">BLK</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.blk}
                  onChange={(e) =>
                    onStatChange(index, "blk", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">FLS</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.fls}
                  onChange={(e) =>
                    onStatChange(index, "fls", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>
              <div>
                <Label className="text-xs">TO</Label>
                <Input
                  type="number"
                  min="0"
                  value={playerStats.turnovers}
                  onChange={(e) =>
                    onStatChange(index, "turnovers", parseInt(e.target.value) || 0)
                  }
                  className="h-8"
                />
              </div>

              {/* Shooting Stats */}
              <div className="col-span-2">
                <Label className="text-xs">FG (Made/Att)</Label>
                <div className="flex space-x-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Made"
                    value={playerStats.fgm}
                    onChange={(e) =>
                      onStatChange(index, "fgm", parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                  <span className="flex items-center">/</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Att"
                    value={playerStats.fga}
                    onChange={(e) =>
                      onStatChange(index, "fga", parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs">3PT (Made/Att)</Label>
                <div className="flex space-x-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Made"
                    value={playerStats.three_pm}
                    onChange={(e) =>
                      onStatChange(index, "three_pm", parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                  <span className="flex items-center">/</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Att"
                    value={playerStats.three_pa}
                    onChange={(e) =>
                      onStatChange(index, "three_pa", parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <Label className="text-xs">FT (Made/Att)</Label>
                <div className="flex space-x-1">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Made"
                    value={playerStats.ftm}
                    onChange={(e) =>
                      onStatChange(index, "ftm", parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                  <span className="flex items-center">/</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Att"
                    value={playerStats.fta}
                    onChange={(e) =>
                      onStatChange(index, "fta", parseInt(e.target.value) || 0)
                    }
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
