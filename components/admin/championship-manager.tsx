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
      toast.error("시즌과 우승팀을 선택하세요.");
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
      toast.success("우승 기록이 저장되었습니다.");
    } catch (error: any) {
      toast.error(error.message || "우승 기록 저장 실패");
    }
  };

  const addAward = async () => {
    if (!awardSeasonId || !awardPlayerId || !awardType) {
      toast.error("시즌/선수/상을 선택하세요.");
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
      toast.success("시상 정보가 저장되었습니다.");
    } catch (error: any) {
      toast.error(error.message || "시상 저장 실패");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            시즌 우승 기록
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={seasonId} onValueChange={setSeasonId}>
            <SelectTrigger>
              <SelectValue placeholder="시즌 선택" />
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
              <span className="text-sm text-muted-foreground">우승팀</span>
              <Select value={championId} onValueChange={setChampionId}>
                <SelectTrigger>
                  <SelectValue placeholder="우승팀 선택" />
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
              <span className="text-sm text-muted-foreground">준우승팀</span>
              <Select value={runnerUpId} onValueChange={setRunnerUpId}>
                <SelectTrigger>
                  <SelectValue placeholder="준우승팀 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
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
              <span className="text-sm text-muted-foreground">파이널 MVP</span>
              <Select value={finalsMvpId} onValueChange={setFinalsMvpId}>
                <SelectTrigger>
                  <SelectValue placeholder="선수 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">선택 안함</SelectItem>
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
                <span className="text-sm text-muted-foreground">시리즈 승</span>
                <Input
                  type="number"
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                  min={0}
                />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">시리즈 패</span>
                <Input
                  type="number"
                  value={losses}
                  onChange={(e) => setLosses(e.target.value)}
                  min={0}
                />
              </div>
            </div>
          </div>

          <Button onClick={recordChampion} className="w-full">
            우승 기록 저장
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            시즌 시상 추가
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={awardSeasonId} onValueChange={setAwardSeasonId}>
            <SelectTrigger>
              <SelectValue placeholder="시즌 선택" />
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
              <SelectItem value="mvp">정규시즌 MVP</SelectItem>
              <SelectItem value="finals_mvp">파이널 MVP</SelectItem>
              <SelectItem value="scoring_leader">득점왕</SelectItem>
              <SelectItem value="assist_leader">어시스트왕</SelectItem>
              <SelectItem value="rebound_leader">리바운드왕</SelectItem>
              <SelectItem value="dpoy">수비왕(DPOY)</SelectItem>
              <SelectItem value="all_star">올스타</SelectItem>
            </SelectContent>
          </Select>

          <Select value={awardPlayerId} onValueChange={setAwardPlayerId}>
            <SelectTrigger>
              <SelectValue placeholder="선수를 선택하세요" />
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
            placeholder="관련 스탯 (선택)"
            value={awardStat}
            onChange={(e) => setAwardStat(e.target.value)}
          />

          <Button variant="secondary" onClick={addAward} className="w-full">
            시상 저장
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
