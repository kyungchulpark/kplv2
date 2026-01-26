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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ban, Plus, Minus, X, AlertTriangle } from "lucide-react";

interface PlayerDiscipline {
  id: string;
  player_id: string;
  season_id: string;
  games_suspended: number;
  games_remaining: number;
  reason: string;
  applied_at: string;
  completed_at: string | null;
  is_active: boolean;
  player: {
    id: string;
    psn_id: string;
    email: string;
  };
}

interface Player {
  id: string;
  psn_id: string;
  email: string;
}

interface DisciplineManagerProps {
  currentSeasonId: string;
}

export default function DisciplineManager({
  currentSeasonId,
}: DisciplineManagerProps) {
  const [disciplines, setDisciplines] = useState<PlayerDiscipline[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [games, setGames] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadDisciplines();
    loadPlayers();
  }, [currentSeasonId]);

  async function loadDisciplines() {
    try {
      const response = await fetch(
        `/api/admin/disciplines?seasonId=${currentSeasonId}`
      );

      if (!response.ok) {
        throw new Error("Failed to load disciplines");
      }

      const data = await response.json();
      setDisciplines(data.disciplines || []);
    } catch (error) {
      console.error("Error loading disciplines:", error);
      toast.error("징계 목록을 불러오는데 실패했습니다");
    }
  }

  async function loadPlayers() {
    try {
      // Get all active players
      const { data: players, error } = await supabase
        .from("profiles")
        .select("id, psn_id, email")
        .eq("is_active", true)
        .order("psn_id");

      if (error) throw error;

      setAvailablePlayers(players || []);
    } catch (error) {
      console.error("Error loading players:", error);
      toast.error("선수 목록을 불러오는데 실패했습니다");
    }
  }

  async function handleApplyDiscipline() {
    if (!selectedPlayer || !games || !reason.trim()) {
      toast.error("모든 필드를 입력해주세요");
      return;
    }

    const gamesNum = parseInt(games);
    if (gamesNum < 1) {
      toast.error("징계 경기 수는 1 이상이어야 합니다");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/disciplines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: selectedPlayer,
          seasonId: currentSeasonId,
          games: gamesNum,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to apply discipline");
      }

      toast.success("징계가 부여되었습니다");
      setDialogOpen(false);
      setSelectedPlayer("");
      setGames("1");
      setReason("");
      await loadDisciplines();
    } catch (error: any) {
      console.error("Error applying discipline:", error);
      toast.error(error.message || "징계 부여에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustGames(disciplineId: string, adjustment: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/disciplines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disciplineId,
          adjustment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to adjust games");
      }

      toast.success("출장정지 경기 수가 조정되었습니다");
      await loadDisciplines();
    } catch (error: any) {
      console.error("Error adjusting games:", error);
      toast.error(error.message || "경기 수 조정에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveDiscipline(disciplineId: string, playerName: string) {
    if (!confirm(`정말 ${playerName}의 징계를 제거하시겠습니까?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/disciplines?disciplineId=${disciplineId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to remove discipline");
      }

      toast.success("징계가 제거되었습니다");
      await loadDisciplines();
    } catch (error: any) {
      console.error("Error removing discipline:", error);
      toast.error(error.message || "징계 제거에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  const activeDisciplines = disciplines.filter((d) => d.is_active && d.games_remaining > 0);
  const completedDisciplines = disciplines.filter((d) => !d.is_active || d.games_remaining === 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                선수 징계 관리
              </CardTitle>
              <CardDescription>
                선수의 출장정지를 관리합니다. 경기 종료 시 자동으로 남은 경기 수가
                감소합니다.
              </CardDescription>
            </div>
            <Button onClick={() => setDialogOpen(true)} disabled={loading}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              징계 부여
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Disciplines */}
          <div>
            <h3 className="text-sm font-medium mb-3">
              활성 징계 ({activeDisciplines.length})
            </h3>
            {activeDisciplines.length > 0 ? (
              <div className="space-y-2">
                {activeDisciplines.map((discipline) => (
                  <div
                    key={discipline.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {discipline.player.psn_id}
                          </span>
                          <Badge variant="destructive">
                            {discipline.games_remaining}/{discipline.games_suspended}경기
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          사유: {discipline.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          부여일: {new Date(discipline.applied_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustGames(discipline.id, 1)}
                          disabled={loading || discipline.games_remaining >= discipline.games_suspended}
                          title="경기 수 증가"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAdjustGames(discipline.id, -1)}
                          disabled={loading || discipline.games_remaining <= 0}
                          title="경기 수 감소"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleRemoveDiscipline(
                              discipline.id,
                              discipline.player.psn_id
                            )
                          }
                          disabled={loading}
                          title="징계 제거"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                활성 징계가 없습니다
              </p>
            )}
          </div>

          {/* Completed Disciplines */}
          {completedDisciplines.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                완료된 징계 ({completedDisciplines.length})
              </h3>
              <div className="space-y-2">
                {completedDisciplines.map((discipline) => (
                  <div
                    key={discipline.id}
                    className="border rounded-lg p-3 opacity-60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {discipline.player.psn_id}
                          </span>
                          <Badge variant="outline">
                            {discipline.games_suspended}경기 (완료)
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {discipline.reason}
                        </p>
                      </div>
                      {discipline.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          완료: {new Date(discipline.completed_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Discipline Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>징계 부여</DialogTitle>
            <DialogDescription>
              선수에게 출장정지 징계를 부여합니다. 경기 참가 시 자동으로 남은 경기
              수가 감소합니다.
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
                      {player.psn_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="games">출장정지 경기 수</Label>
              <Input
                id="games"
                type="number"
                min="1"
                value={games}
                onChange={(e) => setGames(e.target.value)}
                placeholder="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">사유</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="징계 사유를 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleApplyDiscipline}
              disabled={loading || !selectedPlayer || !games || !reason.trim()}
            >
              징계 부여
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
