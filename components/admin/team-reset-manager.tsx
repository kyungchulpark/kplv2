"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, RotateCcw } from "lucide-react";

type Team = {
  id: string;
  name: string;
};

interface TeamResetManagerProps {
  teams: Team[];
  seasonId: string;
  onSuccess?: () => void;
}

export function TeamResetManager({
  teams,
  seasonId,
  onSuccess,
}: TeamResetManagerProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleResetTeam = async () => {
    if (!selectedTeam) {
      toast.error("팀을 선택하세요.");
      return;
    }

    const teamName = teams.find((t) => t.id === selectedTeam)?.name || "";

    if (
      !confirm(
        `${teamName}의 모든 경기 결과를 초기화하고 예정 상태로 되돌릴까요?\n기록/승점이 모두 재계산됩니다.`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { data: matchRows, error: matchError } = await supabase
        .from("matches")
        .select("id")
        .eq("season_id", seasonId)
        .or(`home_team_id.eq.${selectedTeam},away_team_id.eq.${selectedTeam}`);

      if (matchError) throw matchError;

      const matchIds = (matchRows || []).map((m) => m.id);

      if (matchIds.length > 0) {
        await supabase.from("match_stats").delete().in("match_id", matchIds);

        const { error: updateError } = await supabase
          .from("matches")
          .update({
            status: "scheduled",
            home_score: null,
            away_score: null,
            is_forfeit: false,
            forfeit_winner_id: null,
            forfeit_reason: null,
            updated_at: new Date().toISOString(),
          })
          .in("id", matchIds);

        if (updateError) throw updateError;
      }

      const { error: recalcError } = await supabase.rpc(
        "recalculate_team_standings"
      );
      if (recalcError) throw recalcError;

      toast.success("팀 경기 결과를 모두 리셋했습니다.");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "팀 경기 리셋 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        <span>선택한 팀의 모든 경기 결과를 초기화합니다.</span>
      </div>
      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
        <SelectTrigger>
          <SelectValue placeholder="팀을 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="destructive"
        onClick={handleResetTeam}
        disabled={loading}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        팀 경기 전부 리셋
      </Button>
    </div>
  );
}
