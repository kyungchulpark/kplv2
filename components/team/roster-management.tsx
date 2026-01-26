"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, Edit, Trash2, Save, X, Crown, UserCog, Ban } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface Team {
  id: string;
  name: string;
  season_id: string;
}

interface RosterMember {
  id: string;
  player_id: string;
  team_id: string;
  jersey_number: number | null;
  position: string | null;
  player: {
    id: string;
    psn_id: string;
    avatar_url: string | null;
    email: string | null;
  };
}

interface AvailablePlayer {
  id: string;
  psn_id: string;
  email: string | null;
  avatar_url: string | null;
}

interface RosterManagementProps {
  team: Team;
  roster: RosterMember[];
  availablePlayers: AvailablePlayer[];
}

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];

export function RosterManagement({
  team,
  roster: initialRoster,
  availablePlayers,
}: RosterManagementProps) {
  const router = useRouter();
  const [roster, setRoster] = useState(initialRoster);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<RosterMember | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [jerseyNumber, setJerseyNumber] = useState<string>("");
  const [position, setPosition] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [teamRoles, setTeamRoles] = useState<Record<string, string>>({});
  const [disciplines, setDisciplines] = useState<Record<string, { games_remaining: number; reason: string }>>({});

  const supabase = createClient();

  // Fetch team roles and disciplines on mount
  useEffect(() => {
    fetchTeamRoles();
    fetchDisciplines();
  }, [team.id, team.season_id]);

  const fetchTeamRoles = async () => {
    try {
      const { data: roles, error } = await supabase
        .from("team_roles")
        .select("player_id, role")
        .eq("team_id", team.id)
        .eq("season_id", team.season_id)
        .eq("is_active", true)
        .in("role", ["captain", "vice_captain"]);

      if (error) throw error;

      // Create a map of player_id to role
      const rolesMap: Record<string, string> = {};
      roles?.forEach((role) => {
        rolesMap[role.player_id] = role.role;
      });
      setTeamRoles(rolesMap);
    } catch (error) {
      console.error("Error fetching team roles:", error);
    }
  };

  const fetchDisciplines = async () => {
    try {
      const { data: disciplineData, error } = await supabase
        .from("player_disciplines")
        .select("player_id, games_remaining, reason")
        .eq("season_id", team.season_id)
        .eq("is_active", true)
        .gt("games_remaining", 0);

      if (error) throw error;

      // Create a map of player_id to discipline info
      const disciplinesMap: Record<string, { games_remaining: number; reason: string }> = {};
      disciplineData?.forEach((disc) => {
        disciplinesMap[disc.player_id] = {
          games_remaining: disc.games_remaining,
          reason: disc.reason,
        };
      });
      setDisciplines(disciplinesMap);
    } catch (error) {
      console.error("Error fetching disciplines:", error);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("team_rosters").insert({
        team_id: team.id,
        player_id: selectedPlayer,
        jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
        position: position || null,
        is_active: true,
      });

      if (error) throw error;

      setAddDialogOpen(false);
      setSelectedPlayer("");
      setJerseyNumber("");
      setPosition("");
      router.refresh();
    } catch (error) {
      console.error("Error adding player:", error);
      alert("선수 추가 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("team_rosters")
        .update({
          jersey_number: jerseyNumber ? parseInt(jerseyNumber) : null,
          position: position || null,
        })
        .eq("id", editingMember.id);

      if (error) throw error;

      setEditingMember(null);
      setJerseyNumber("");
      setPosition("");
      router.refresh();
    } catch (error) {
      console.error("Error updating member:", error);
      alert("선수 정보 수정 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("정말로 이 선수를 로스터에서 제외하시겠습니까?")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("team_rosters")
        .update({ is_active: false })
        .eq("id", memberId);

      if (error) throw error;

      router.refresh();
    } catch (error) {
      console.error("Error removing member:", error);
      alert("선수 제외 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (member: RosterMember) => {
    setEditingMember(member);
    setJerseyNumber(member.jersey_number?.toString() || "");
    setPosition(member.position || "");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>로스터 관리</CardTitle>
              <CardDescription>
                팀 로스터를 관리하고 선수 정보를 수정할 수 있습니다.
              </CardDescription>
            </div>
            <Button onClick={() => setAddDialogOpen(true)} disabled={loading}>
              <UserPlus className="h-4 w-4 mr-2" />
              선수 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {roster.length > 0 ? (
            <div className="space-y-2">
              {roster.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.player.avatar_url || undefined} />
                      <AvatarFallback>
                        {member.player.psn_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-lg ${disciplines[member.player_id] ? "line-through text-muted-foreground" : ""}`}>
                          {member.player.psn_id}
                        </p>
                        {teamRoles[member.player_id] === "captain" && (
                          <Badge variant="default" className="flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            주장
                          </Badge>
                        )}
                        {teamRoles[member.player_id] === "vice_captain" && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <UserCog className="h-3 w-3" />
                            부주장
                          </Badge>
                        )}
                        {disciplines[member.player_id] && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Ban className="h-3 w-3" />
                            징계 중 ({disciplines[member.player_id].games_remaining}경기)
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.position && `${member.position} • `}
                        {member.jersey_number && `#${member.jersey_number}`}
                        {disciplines[member.player_id] && ` • ${disciplines[member.player_id].reason}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(member)}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              로스터에 등록된 선수가 없습니다. 선수를 추가해주세요.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Player Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>선수 추가</DialogTitle>
            <DialogDescription>
              로스터에 추가할 선수를 선택하고 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>선수 선택</Label>
              <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                <SelectTrigger>
                  <SelectValue placeholder="선수를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.psn_id} ({player.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jersey">등번호 (선택)</Label>
              <Input
                id="jersey"
                type="number"
                placeholder="0-99"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                min="0"
                max="99"
              />
            </div>
            <div className="space-y-2">
              <Label>포지션 (선택)</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="포지션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button onClick={handleAddPlayer} disabled={loading || !selectedPlayer}>
              <Save className="h-4 w-4 mr-2" />
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>선수 정보 수정</DialogTitle>
            <DialogDescription>
              {editingMember?.player.psn_id}의 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-jersey">등번호</Label>
              <Input
                id="edit-jersey"
                type="number"
                placeholder="0-99"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                min="0"
                max="99"
              />
            </div>
            <div className="space-y-2">
              <Label>포지션</Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger>
                  <SelectValue placeholder="포지션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingMember(null)}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              취소
            </Button>
            <Button onClick={handleUpdateMember} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
