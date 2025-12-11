"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Trophy } from "lucide-react";

type Season = { id: string; name: string };
type Team = { id: string; name: string };
type Player = { id: string; psn_id: string };

interface ChampionshipManagerProps {
  seasons: Season[];
  teams: Team[];
  players: Player[];
  defaultSeasonId?: string;
}

export function ChampionshipManager({
  seasons,
  teams,
  players,
  defaultSeasonId,
}: ChampionshipManagerProps) {
  const supabase = createClient();
  const [seasonId, setSeasonId] = useState<string>(
    defaultSeasonId || seasons[0]?.id || ""
  );
  const [championId, setChampionId] = useState<string>("");
  const [runnerUpId, setRunnerUpId] = useState<string>("");
  const [finalsMvpId, setFinalsMvpId] = useState<string>("");
  const [wins, setWins] = useState("3");
  const [losses, setLosses] = useState("0");

  const [awardSeasonId, setAwardSeasonId] = useState<string>(
    defaultSeasonId || seasons[0]?.id || ""
  );
  const [awardPlayerId, setAwardPlayerId] = useState<string>("");
  const [awardType, setAwardType] = useState<string>("mvp");
  const [awardStat, setAwardStat] = useState<string>("");

  const recordChampion = async () => {
    if (!seasonId || !championId) {
      toast.error("Select a season and champion.");
      return;
    }

    try {
      const { error } = await supabase.rpc("record_championship", {
        p_season_id: seasonId,
        p_champion_team_id: championId,
        p_runner_up_team_id: runnerUpId || null,
        p_finals_mvp_id: finalsMvpId || null,
        p_series_wins: parseInt(wins) || 0,
        p_series_losses: parseInt(losses) || 0,
      });

      if (error) throw error;
      toast.success("Championship saved.");
    } catch (error: any) {
      toast.error(error.message || "Failed to save championship.");
    }
  };

  const addAward = async () => {
    if (!awardSeasonId || !awardPlayerId || !awardType) {
      toast.error("Select season, award type, and player.");
      return;
    }

    try {
      const { error } = await supabase.from("season_awards").upsert({
        season_id: awardSeasonId,
        player_id: awardPlayerId,
        award_type: awardType,
        stat_value: awardStat ? Number(awardStat) : null,
      });
      if (error) throw error;
      toast.success("Award saved.");
    } catch (error: any) {
      toast.error(error.message || "Failed to save award.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Record Championship
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Champion</span>
              <Select value={championId} onValueChange={setChampionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Runner-up</span>
              <Select value={runnerUpId} onValueChange={setRunnerUpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">
                Finals MVP
              </span>
              <Select value={finalsMvpId} onValueChange={setFinalsMvpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.psn_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-sm text-muted-foreground">Wins</span>
                <Input
                  type="number"
                  value={wins}
                  min={0}
                  onChange={(e) => setWins(e.target.value)}
                />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Losses</span>
                <Input
                  type="number"
                  value={losses}
                  min={0}
                  onChange={(e) => setLosses(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button onClick={recordChampion} className="w-full">
            Save Championship
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Add Season Award
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={awardSeasonId} onValueChange={setAwardSeasonId}>
            <SelectTrigger>
              <SelectValue placeholder="Select season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={awardType} onValueChange={setAwardType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mvp">Regular Season MVP</SelectItem>
              <SelectItem value="finals_mvp">Finals MVP</SelectItem>
              <SelectItem value="scoring_leader">Scoring Leader</SelectItem>
              <SelectItem value="assist_leader">Assist Leader</SelectItem>
              <SelectItem value="rebound_leader">Rebound Leader</SelectItem>
              <SelectItem value="dpoy">Defensive Player (DPOY)</SelectItem>
              <SelectItem value="all_star">All-Star</SelectItem>
            </SelectContent>
          </Select>

          <Select value={awardPlayerId} onValueChange={setAwardPlayerId}>
            <SelectTrigger>
              <SelectValue placeholder="Select player" />
            </SelectTrigger>
            <SelectContent>
              {players.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.psn_id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            step="0.1"
            placeholder="Stat value (optional)"
            value={awardStat}
            onChange={(e) => setAwardStat(e.target.value)}
          />

          <Button variant="secondary" onClick={addAward} className="w-full">
            Save Award
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
