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
  home_score?: number | null;
  away_score?: number | null;
  is_forfeit?: boolean | null;
  forfeit_winner_id?: string | null;
  forfeit_reason?: string | null;
  home_stream_url?: string | null;
  away_stream_url?: string | null;
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

interface InitialPlayerStats {
  player_id: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  ftm: number;
  fta: number;
  turnovers: number;
  fouls: number;
}

interface MatchStatsInputProps {
  match: MatchData;
  homeRoster: Player[];
  awayRoster: Player[];
  initialHomeStats?: InitialPlayerStats[];
  initialAwayStats?: InitialPlayerStats[];
  initialHomeStreamUrl?: string;
  initialAwayStreamUrl?: string;
  isEditing?: boolean;
  onSuccessRedirect?: string;
}

export function MatchStatsInput({
  match,
  homeRoster,
  awayRoster,
  initialHomeStats = [],
  initialAwayStats = [],
  initialHomeStreamUrl = "",
  initialAwayStreamUrl = "",
  isEditing = false,
  onSuccessRedirect = "/admin",
}: MatchStatsInputProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Streaming URLs
  const [homeStreamUrl, setHomeStreamUrl] = useState(initialHomeStreamUrl);
  const [awayStreamUrl, setAwayStreamUrl] = useState(initialAwayStreamUrl);

  const calculatePoints = (stats: PlayerStats): number => {
    return (stats.fgm - stats.three_pm) * 2 + stats.three_pm * 3 + stats.ftm;
  };

  const validateStats = (
    homeStats: PlayerStats[],
    awayStats: PlayerStats[]
  ): string[] => {
    const validationErrors: string[] = [];

    if (homeRoster.length < 5) {
      validationErrors.push("Home team must have at least 5 active roster players.");
    }
    if (awayRoster.length < 5) {
      validationErrors.push("Away team must have at least 5 active roster players.");
    }

    // Check if all players are selected
    const allHomeSelected = homeStats.every((s) => s.player_id !== "");
    const allAwaySelected = awayStats.every((s) => s.player_id !== "");

    if (!allHomeSelected) {
      validationErrors.push("Please select all 5 home team players.");
    }
    if (!allAwaySelected) {
      validationErrors.push("Please select all 5 away team players.");
    }

    // Check for duplicate players
    const homePlayerIds = homeStats.map((s) => s.player_id).filter(Boolean);
    const awayPlayerIds = awayStats.map((s) => s.player_id).filter(Boolean);

    if (new Set(homePlayerIds).size !== homePlayerIds.length) {
      validationErrors.push("Duplicate players found in home team.");
    }
    if (new Set(awayPlayerIds).size !== awayPlayerIds.length) {
      validationErrors.push("Duplicate players found in away team.");
    }
    const allPlayers = [...homePlayerIds, ...awayPlayerIds];
    if (new Set(allPlayers).size !== allPlayers.length) {
      validationErrors.push("Same player appears on both teams.");
    }

    // Validate stats for each player
    [...homeStats, ...awayStats].forEach((stats, idx) => {
      if (!stats.player_id) return;

      const team = idx < 5 ? "Home" : "Away";
      const playerNum = (idx % 5) + 1;

      if (stats.fgm > stats.fga) {
        validationErrors.push(
          `${team} P${playerNum}: FGM (${stats.fgm}) exceeds FGA (${stats.fga}).`
        );
      }
      if (stats.three_pm > stats.three_pa) {
        validationErrors.push(
          `${team} P${playerNum}: 3PM (${stats.three_pm}) exceeds 3PA (${stats.three_pa}).`
        );
      }
      if (stats.ftm > stats.fta) {
        validationErrors.push(
          `${team} P${playerNum}: FTM (${stats.ftm}) exceeds FTA (${stats.fta}).`
        );
      }
      if (stats.three_pm > stats.fgm) {
        validationErrors.push(
          `${team} P${playerNum}: 3PM (${stats.three_pm}) exceeds total FGM (${stats.fgm}).`
        );
      }

      const calculatedPts = calculatePoints(stats);
      if (stats.pts !== calculatedPts) {
        validationErrors.push(
          `${team} P${playerNum}: Points (${stats.pts}) don't match calculated value (${calculatedPts}). Will be auto-corrected.`
        );
      }
    });

    return validationErrors;
  };

  const convertInitialStats = (stats: InitialPlayerStats[]): PlayerStats[] =>
    stats.map((s) => ({
      player_id: s.player_id,
      pts: s.pts ?? 0,
      reb: s.reb ?? 0,
      ast: s.ast ?? 0,
      stl: s.stl ?? 0,
      blk: s.blk ?? 0,
      fls: s.fouls ?? 0,
      turnovers: s.turnovers ?? 0,
      fgm: s.fgm ?? 0,
      fga: s.fga ?? 0,
      three_pm: s.tpm ?? 0,
      three_pa: s.tpa ?? 0,
      ftm: s.ftm ?? 0,
      fta: s.fta ?? 0,
    }));

  const initialHomeStatsForInput = convertInitialStats(initialHomeStats);
  const initialAwayStatsForInput = convertInitialStats(initialAwayStats);
  const hasInitialStats =
    initialHomeStatsForInput.length > 0 || initialAwayStatsForInput.length > 0;

  const handleSubmit = async (data: {
    homeScore: number;
    awayScore: number;
    homeStats: PlayerStats[];
    awayStats: PlayerStats[];
  }) => {
    // Validate streaming URLs
    if (!homeStreamUrl || !awayStreamUrl) {
      setErrors(["Please provide streaming URLs for both home and away teams."]);
      toast.error("Streaming URLs are required");
      return;
    }

    const validationErrors = validateStats(data.homeStats, data.awayStats);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error("Please check your input");
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

      // Clear existing stats when editing to avoid duplicates
      if (isEditing || hasInitialStats) {
        const { error: deleteError } = await supabase
          .from("match_stats")
          .delete()
          .eq("match_id", match.id);
        if (deleteError) throw deleteError;
      }

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

      const beforeMatch = {
        status: match.status,
        home_score: match.home_score ?? null,
        away_score: match.away_score ?? null,
        is_forfeit: match.is_forfeit ?? false,
        forfeit_winner_id: match.forfeit_winner_id ?? null,
        forfeit_reason: match.forfeit_reason ?? null,
        home_stream_url: match.home_stream_url ?? null,
        away_stream_url: match.away_stream_url ?? null,
      };

      const afterMatch = {
        status: "finished",
        home_score: homeScore,
        away_score: awayScore,
        is_forfeit: match.is_forfeit ?? false,
        forfeit_winner_id: match.forfeit_winner_id ?? null,
        forfeit_reason: match.forfeit_reason ?? null,
        home_stream_url: homeStreamUrl,
        away_stream_url: awayStreamUrl,
      };

      const beforeStats = [
        ...initialHomeStatsForInput.map((s) => ({
          team_id: match.home_team_id,
          player_id: s.player_id,
          pts: s.pts,
          reb: s.reb,
          ast: s.ast,
          stl: s.stl,
          blk: s.blk,
          fls: s.fouls,
          turnovers: s.turnovers,
          fgm: s.fgm,
          fga: s.fga,
          three_pm: s.tpm,
          three_pa: s.tpa,
          ftm: s.ftm,
          fta: s.fta,
        })),
        ...initialAwayStatsForInput.map((s) => ({
          team_id: match.away_team_id,
          player_id: s.player_id,
          pts: s.pts,
          reb: s.reb,
          ast: s.ast,
          stl: s.stl,
          blk: s.blk,
          fls: s.fouls,
          turnovers: s.turnovers,
          fgm: s.fgm,
          fga: s.fga,
          three_pm: s.tpm,
          three_pa: s.tpa,
          ftm: s.ftm,
          fta: s.fta,
        })),
      ];

      const afterStats = [
        ...correctedHomeStats.map((s) => ({
          team_id: match.home_team_id,
          player_id: s.player_id,
          pts: s.pts,
          reb: s.reb,
          ast: s.ast,
          stl: s.stl,
          blk: s.blk,
          fls: s.fls,
          turnovers: s.turnovers,
          fgm: s.fgm,
          fga: s.fga,
          three_pm: s.three_pm,
          three_pa: s.three_pa,
          ftm: s.ftm,
          fta: s.fta,
        })),
        ...correctedAwayStats.map((s) => ({
          team_id: match.away_team_id,
          player_id: s.player_id,
          pts: s.pts,
          reb: s.reb,
          ast: s.ast,
          stl: s.stl,
          blk: s.blk,
          fls: s.fls,
          turnovers: s.turnovers,
          fgm: s.fgm,
          fga: s.fga,
          three_pm: s.three_pm,
          three_pa: s.three_pa,
          ftm: s.ftm,
          fta: s.fta,
        })),
      ];

      const action = isEditing || hasInitialStats ? "update" : "create";
      const { data: authData } = await supabase.auth.getUser();
      const editorId = authData.user?.id;
      if (editorId) {
        const { error: auditError } = await supabase
          .from("match_result_audits")
          .insert({
            match_id: match.id,
            editor_id: editorId,
            action,
            before_match: beforeMatch,
            after_match: afterMatch,
            before_stats: beforeStats,
            after_stats: afterStats,
          });
        if (auditError) {
          console.error("Error writing match audit:", auditError);
        }

        const { error: activityError } = await supabase
          .from("activity_logs")
          .insert({
            actor_id: editorId,
            action,
            entity_type: "match",
            entity_id: match.id,
            details: {
              match_id: match.id,
              season_id: match.season_id,
              season_name: match.season?.name ?? null,
              home_team_name: match.home_team.name,
              away_team_name: match.away_team.name,
            },
          });
        if (activityError) {
          console.error("Error writing activity log:", activityError);
        }
      }

      // Recalculate standings after any result change
      const { error: recalcError } = await supabase.rpc(
        "recalculate_team_standings",
        { p_season_id: match.season_id }
      );
      if (recalcError) {
        console.error("Error recalculating standings:", recalcError);
      }

      toast.success(
        isEditing ? "Match results updated." : "Match results saved successfully."
      );
      router.push(onSuccessRedirect);
      router.refresh();
    } catch (error: unknown) {
      console.error("Error saving match stats:", error);
      console.error("Error JSON:", JSON.stringify(error, null, 2));

      let errorMessage = "An error occurred while saving match results.";
      if (error && typeof error === "object") {
        const err = error as {
          message?: string;
          details?: string;
          hint?: string;
          code?: string;
        };
        if (err.message) {
          errorMessage = `Error: ${err.message}`;
          if (err.details) errorMessage += ` (${err.details})`;
          if (err.hint) errorMessage += ` - Hint: ${err.hint}`;
          if (err.code) errorMessage += ` [Code: ${err.code}]`;
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
        <h1 className="text-3xl font-bold">
          {isEditing ? "Edit Match Results" : "Submit Match Results"}
        </h1>
        <p className="text-muted-foreground">
          {match.season.name} - {new Date(match.match_date).toLocaleDateString("en-US")}
        </p>
        <p className="text-sm text-muted-foreground">
          {match.home_team.name} vs {match.away_team.name}
        </p>
        {isEditing && (
          <p className="text-sm text-amber-600">
            Saving will replace existing stats and recalculate standings.
          </p>
        )}
      </div>

      {/* Stream URL Inputs */}
      <StreamUrlInputs
        homeTeamName={match.home_team.name}
        awayTeamName={match.away_team.name}
        onHomeUrlChange={setHomeStreamUrl}
        onAwayUrlChange={setAwayStreamUrl}
        initialHomeUrl={initialHomeStreamUrl}
        initialAwayUrl={initialAwayStreamUrl}
      />

      {/* Errors */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive mb-2">Validation Errors</h3>
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
        initialHomeStats={initialHomeStatsForInput}
        initialAwayStats={initialAwayStatsForInput}
        onSubmit={handleSubmit}
      />

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="text-lg font-semibold">Saving...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
