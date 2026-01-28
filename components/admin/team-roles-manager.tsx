"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Crown, UserCog, X } from "lucide-react";

interface TeamRole {
  id: string;
  team_id: string;
  player_id: string;
  season_id: string;
  role: string;
  granted_at: string;
  is_active: boolean;
  player: {
    id: string;
    psn_id: string;
    email: string;
  };
}

interface Team {
  id: string;
  name: string;
  season_id: string;
  captain_id?: string | null;
  captain?: {
    id: string;
    psn_id: string;
    email: string;
  } | null;
}

interface Player {
  id: string;
  psn_id: string;
  email: string;
}

interface TeamRostersManagerProps {
  teams: Team[];
  currentSeasonId: string;
}

export default function TeamRolesManager({
  teams,
  currentSeasonId,
}: TeamRostersManagerProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamRoles, setTeamRoles] = useState<TeamRole[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"captain" | "vice_captain">(
    "vice_captain"
  );
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamRoles();
      loadAvailablePlayers();
    }
  }, [selectedTeamId]);

  async function loadTeamRoles() {
    try {
      const response = await fetch(
        `/api/admin/team-roles?teamId=${selectedTeamId}&seasonId=${currentSeasonId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load team roles");
      }

      const data = await response.json();
      setTeamRoles(data.roles || []);
    } catch (error) {
      console.error("Error loading team roles:", error);
      toast.error("팀 역할을 불러오는데 실패했습니다");
    }
  }

  async function loadAvailablePlayers() {
    try {
      // Get all active players on this team's roster
      const { data: roster, error } = await supabase
        .from("team_rosters")
        .select(
          `
          player_id,
          player:profiles!team_rosters_player_id_fkey(id, psn_id, email)
        `
        )
        .eq("team_id", selectedTeamId)
        .eq("season_id", currentSeasonId)
        .eq("is_active", true);

      if (error) throw error;

      const players = roster?.map((r: any) => r.player).filter(Boolean) || [];
      setAvailablePlayers(players);
    } catch (error) {
      console.error("Error loading players:", error);
      toast.error("선수 목록을 불러오는데 실패했습니다");
    }
  }

  async function handleGrantRole() {
    if (!selectedPlayer || !selectedTeamId) {
      toast.error("팀과 선수를 선택해주세요");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/team-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeamId,
          playerId: selectedPlayer,
          seasonId: currentSeasonId,
          role: selectedRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to grant role");
      }

      toast.success(
        `${selectedRole === "captain" ? "주장" : "부주장"} 역할이 부여되었습니다`
      );
      setSelectedPlayer("");
      await loadTeamRoles();
    } catch (error: any) {
      console.error("Error granting role:", error);
      toast.error(error.message || "역할 부여에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevokeRole(roleId: string, roleName: string) {
    if (!confirm(`정말 ${roleName} 역할을 회수하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/team-roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to revoke role");
      }

      toast.success("역할이 회수되었습니다");
      await loadTeamRoles();
    } catch (error: any) {
      console.error("Error revoking role:", error);
      toast.error(error.message || "역할 회수에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  // Find captain from team_roles first, then fallback to teams.captain_id
  const teamRoleCaptain = teamRoles.find((r) => r.role === "captain");
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  // Create a unified captain object - prefer team_roles, fallback to teams.captain_id
  const captain: (TeamRole & { is_legacy?: boolean }) | null = teamRoleCaptain
    ? teamRoleCaptain
    : selectedTeam?.captain
      ? {
          id: `legacy_${selectedTeam.captain.id}`,
          team_id: selectedTeamId,
          player_id: selectedTeam.captain.id,
          season_id: currentSeasonId,
          role: "captain",
          granted_at: "",
          is_active: true,
          is_legacy: true, // Mark as legacy captain (from teams.captain_id)
          player: selectedTeam.captain,
        }
      : null;

  const viceCaptains = teamRoles.filter((r) => r.role === "vice_captain");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          팀 역할 관리
        </CardTitle>
        <CardDescription>
          팀의 주장과 부주장을 관리합니다 (주장 1명, 부주장 다수 가능)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">팀 선택</label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
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
        </div>

        {selectedTeamId && (
          <>
            {/* Current Roles */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">현재 역할</h3>

              {/* Captain */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">주장</span>
                  </div>
                  {captain ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{captain.player.psn_id}</span>
                      {captain.is_legacy ? (
                        <Badge variant="secondary" className="text-xs">
                          기존
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRevokeRole(captain.id, "주장")
                          }
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      지정되지 않음
                    </span>
                  )}
                </div>
              </div>

              {/* Vice Captains */}
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <UserCog className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">부주장</span>
                  <Badge variant="outline" className="ml-auto">
                    {viceCaptains.length}명
                  </Badge>
                </div>
                {viceCaptains.length > 0 ? (
                  <div className="space-y-1 mt-2">
                    {viceCaptains.map((vc) => (
                      <div
                        key={vc.id}
                        className="flex items-center justify-between pl-6"
                      >
                        <span className="text-sm">{vc.player.psn_id}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleRevokeRole(vc.id, "부주장")
                          }
                          disabled={loading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground pl-6">
                    지정된 부주장이 없습니다
                  </p>
                )}
              </div>
            </div>

            {/* Grant Role Form */}
            <div className="border-t pt-4 space-y-3">
              <h3 className="text-sm font-medium">역할 부여</h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    역할
                  </label>
                  <Select
                    value={selectedRole}
                    onValueChange={(value: "captain" | "vice_captain") =>
                      setSelectedRole(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="captain">주장</SelectItem>
                      <SelectItem value="vice_captain">부주장</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    선수
                  </label>
                  <Select
                    value={selectedPlayer}
                    onValueChange={setSelectedPlayer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="선수 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.psn_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleGrantRole}
                disabled={!selectedPlayer || loading}
                className="w-full"
              >
                역할 부여
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
