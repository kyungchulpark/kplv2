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
      toast.error("Please select a team.");
      return;
    }

    const teamName = teams.find((t) => t.id === selectedTeam)?.name || "";

    if (
      !confirm(
        `Reset ALL results for ${teamName}? Scores/forfeit flags will be cleared and stats deleted.`
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
        "recalculate_team_standings",
        { p_season_id: seasonId }
      );
      if (recalcError) throw recalcError;

      toast.success("Team matches have been reset and standings recalculated.");
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset team matches.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        <span>Reset all results for the selected team.</span>
      </div>
      <Select value={selectedTeam} onValueChange={setSelectedTeam}>
        <SelectTrigger>
          <SelectValue placeholder="Select a team" />
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
        Reset all matches
      </Button>
    </div>
  );
}
