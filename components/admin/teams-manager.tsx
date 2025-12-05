"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TeamFormDialog } from "./team-form-dialog";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Team = {
  id: string;
  name: string;
  conference: string;
  logo_url: string | null;
  wins: number;
  losses: number;
  points_for: number;
  points_against: number;
  captain_id: string | null;
  captain: {
    psn_id: string;
  } | null;
  roster_count: number;
};

type TeamsManagerProps = {
  teams: Team[];
  seasonId: string;
  seasonName: string;
};

export function TeamsManager({ teams, seasonId, seasonName }: TeamsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const handleCreate = () => {
    setSelectedTeam(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (team: Team) => {
    setSelectedTeam(team);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = async (teamId: string, teamName: string) => {
    if (!confirm(`"${teamName}" 팀을 삭제하시겠습니까? 모든 관련 데이터가 삭제됩니다.`)) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("teams").delete().eq("id", teamId);

      if (error) throw error;

      toast.success("팀이 삭제되었습니다");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "삭제 실패");
    }
  };

  const winRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return "0.0";
    return ((wins / total) * 100).toFixed(1);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground">
              {seasonName} - {teams.length}개 팀
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Team
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm">
                <th className="text-left py-3 px-2">Team</th>
                <th className="text-center py-3 px-2">Conference</th>
                <th className="text-center py-3 px-2">W-L</th>
                <th className="text-center py-3 px-2">Win%</th>
                <th className="text-center py-3 px-2">Roster</th>
                <th className="text-left py-3 px-2">Captain</th>
                <th className="text-right py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b hover:bg-muted/50">
                  <td className="py-4 px-2">
                    <div className="flex items-center space-x-3">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-nba-red flex items-center justify-center text-xs font-bold text-white">
                          {team.name.substring(0, 2)}
                        </div>
                      )}
                      <span className="font-semibold">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    <Badge
                      variant="outline"
                      className={
                        team.conference === "West"
                          ? "border-nba-blue text-nba-blue"
                          : "border-nba-red text-nba-red"
                      }
                    >
                      {team.conference}
                    </Badge>
                  </td>
                  <td className="py-4 px-2 text-center font-medium">
                    {team.wins}-{team.losses}
                  </td>
                  <td className="py-4 px-2 text-center">
                    {winRate(team.wins, team.losses)}%
                  </td>
                  <td className="py-4 px-2 text-center">
                    <span className="text-sm">{team.roster_count || 0}/5</span>
                  </td>
                  <td className="py-4 px-2">
                    {team.captain ? (
                      <span className="text-sm">{team.captain.psn_id}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(team)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(team.id, team.name)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {teams.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">등록된 팀이 없습니다</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Team
              </Button>
            </div>
          )}
        </div>
      </div>

      <TeamFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        team={selectedTeam}
        mode={dialogMode}
        seasonId={seasonId}
      />
    </>
  );
}
