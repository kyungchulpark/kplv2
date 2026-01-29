"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { AlertCircle, MinusCircle, PlusCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  penalty_points: number;
}

interface PenaltyManagerProps {
  teams: Team[];
  seasonId: string;
  onSuccess?: () => void;
}

export function PenaltyManager({
  teams,
  seasonId,
  onSuccess,
}: PenaltyManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [penaltyPoints, setPenaltyPoints] = useState<string>("0.5");
  const [reason, setReason] = useState("");

  const supabase = createClient();

  const handleAddPenalty = async () => {
    if (!selectedTeamId) {
      toast.error("팀을 선택해주세요");
      return;
    }

    if (!reason.trim()) {
      toast.error("감점 사유를 입력해주세요");
      return;
    }

    const points = parseFloat(penaltyPoints);
    if (isNaN(points) || points <= 0) {
      toast.error("유효한 감점을 입력해주세요 (0.5 단위)");
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      // Insert penalty record
      const { error: penaltyError } = await supabase
        .from("team_penalties")
        .insert({
          team_id: selectedTeamId,
          season_id: seasonId,
          penalty_points: points,
          reason: reason.trim(),
          applied_by: user.id,
        });

      if (penaltyError) throw penaltyError;

      // Update team penalty_points
      const team = teams.find((t) => t.id === selectedTeamId);
      const newPenaltyTotal = (team?.penalty_points || 0) + points;

      const { error: updateError } = await supabase
        .from("teams")
        .update({
          penalty_points: newPenaltyTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTeamId);

      if (updateError) throw updateError;

      toast.success(
        `${team?.name}에 ${points}점 감점이 적용되었습니다`
      );

      // Reset form
      setSelectedTeamId("");
      setPenaltyPoints("0.5");
      setReason("");
      setOpen(false);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error adding penalty:", error);
      toast.error("감점 적용 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePenalty = async (teamId: string, points: number) => {
    if (!confirm("정말 이 감점을 제거하시겠습니까?")) return;

    setLoading(true);

    try {
      const team = teams.find((t) => t.id === teamId);
      const newPenaltyTotal = Math.max(0, (team?.penalty_points || 0) - points);

      const { error } = await supabase
        .from("teams")
        .update({
          penalty_points: newPenaltyTotal,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (error) throw error;

      toast.success(`${team?.name}의 감점이 제거되었습니다`);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error removing penalty:", error);
      toast.error("감점 제거 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const penalizedTeams = teams.filter(
    (team) => team.penalty_points && team.penalty_points > 0
  );

  return (
    <div className="space-y-4">
      {/* Current Penalties */}
      {penalizedTeams.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            현재 감점 현황
          </h3>
          {penalizedTeams.map((team) => (
            <Alert key={team.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div className="flex items-center space-x-2">
                  {team.logo_url && (
                    <img
                        src={team.logo_url}
                        alt={team.name}
                        className="h-6 w-6 object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                  )}
                  <AlertDescription className="font-medium">
                    {team.name}
                  </AlertDescription>
                </div>
                <span className="text-sm font-bold text-red-500">
                  -{team.penalty_points}점
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleRemovePenalty(team.id, team.penalty_points || 0)
                }
                disabled={loading}
              >
                <MinusCircle className="h-4 w-4 mr-1" />
                제거
              </Button>
            </Alert>
          ))}
        </div>
      )}

      {/* Add Penalty Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            감점 추가
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 감점 적용</DialogTitle>
            <DialogDescription>
              규정 위반 또는 기타 사유로 팀에 감점을 부과합니다.
              <br />
              감점은 승점(points)에서 차감됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>팀 선택</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="감점을 적용할 팀 선택" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <div className="flex items-center space-x-2">
                        {team.logo_url && (
                          <img
                              src={team.logo_url}
                              alt={team.name}
                              className="h-5 w-5 object-contain"
                              loading="lazy"
                              decoding="async"
                            />
                        )}
                        <span>{team.name}</span>
                        {team.penalty_points > 0 && (
                          <span className="text-xs text-red-500">
                            (현재 -{team.penalty_points}점)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Penalty Points */}
            <div className="space-y-2">
              <Label>감점 (0.5 단위)</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                value={penaltyPoints}
                onChange={(e) => setPenaltyPoints(e.target.value)}
                placeholder="0.5, 1.0, 1.5, 2.0..."
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>사유</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 규정 위반, 무단 불참 등"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button onClick={handleAddPenalty} disabled={loading}>
              {loading ? "적용 중..." : "감점 적용"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
