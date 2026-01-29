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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { UserX, Undo2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  is_withdrawn: boolean;
}

interface WithdrawalManagerProps {
  teams: Team[];
  seasonId: string;
  onSuccess?: () => void;
}

export function WithdrawalManager({
  teams,
  seasonId,
  onSuccess,
}: WithdrawalManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [reason, setReason] = useState("");

  const supabase = createClient();

  const handleWithdraw = async () => {
    if (!selectedTeamId) {
      toast.error("팀을 선택해주세요");
      return;
    }

    if (!reason.trim()) {
      toast.error("탈퇴 사유를 입력해주세요");
      return;
    }

    const team = teams.find((t) => t.id === selectedTeamId);

    if (
      !confirm(
        `정말 ${team?.name}을(를) 탈퇴 처리하시겠습니까?\n\n이 작업은 다음을 수행합니다:\n- 팀이 탈퇴 상태로 표시됩니다\n- 향후 모든 경기가 자동으로 취소됩니다\n- 순위표에서 (탈퇴) 표시가 나타납니다`
      )
    ) {
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

      // Create withdrawal record
      const { error: withdrawalError } = await supabase
        .from("team_withdrawals")
        .insert({
          team_id: selectedTeamId,
          season_id: seasonId,
          reason: reason.trim(),
          withdrawn_by: user.id,
        });

      if (withdrawalError) throw withdrawalError;

      // Mark team as withdrawn
      const { error: updateError } = await supabase
        .from("teams")
        .update({
          is_withdrawn: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTeamId);

      if (updateError) throw updateError;

      toast.success(`${team?.name}이(가) 탈퇴 처리되었습니다`);

      setSelectedTeamId("");
      setReason("");
      setOpen(false);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error withdrawing team:", error);
      toast.error("탈퇴 처리 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);

    if (!confirm(`${team?.name}의 탈퇴를 취소하시겠습니까?`)) return;

    setLoading(true);

    try {
      // Remove withdrawal record
      const { error: deleteError } = await supabase
        .from("team_withdrawals")
        .delete()
        .eq("team_id", teamId)
        .eq("season_id", seasonId);

      if (deleteError) throw deleteError;

      // Mark team as active
      const { error: updateError } = await supabase
        .from("teams")
        .update({
          is_withdrawn: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", teamId);

      if (updateError) throw updateError;

      toast.success(`${team?.name}의 탈퇴가 취소되었습니다`);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error restoring team:", error);
      toast.error("탈퇴 취소 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const withdrawnTeams = teams.filter((team) => team.is_withdrawn);
  const activeTeams = teams.filter((team) => !team.is_withdrawn);

  return (
    <div className="space-y-4">
      {/* Withdrawn Teams List */}
      {withdrawnTeams.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            탈퇴한 팀 ({withdrawnTeams.length})
          </h3>
          {withdrawnTeams.map((team) => (
            <Alert key={team.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <UserX className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center space-x-2">
                  {team.logo_url && (
                    <img
                        src={team.logo_url}
                        alt={team.name}
                        className="h-6 w-6 object-contain opacity-50"
                        loading="lazy"
                        decoding="async"
                      />
                  )}
                  <AlertDescription className="font-medium line-through">
                    {team.name}
                  </AlertDescription>
                  <span className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">
                    탈퇴
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRestore(team.id)}
                disabled={loading}
              >
                <Undo2 className="h-4 w-4 mr-1" />
                복구
              </Button>
            </Alert>
          ))}
        </div>
      )}

      {/* Withdraw Team Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <UserX className="h-4 w-4 mr-2" />
            팀 탈퇴 처리
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 탈퇴 처리</DialogTitle>
            <DialogDescription>
              팀을 시즌에서 탈퇴시킵니다. 향후 모든 경기가 자동으로
              취소됩니다.
              <br />
              <span className="text-sm text-destructive">
                주의: 이미 완료된 경기 결과는 유지됩니다.
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Team Selection */}
            <div className="space-y-2">
              <Label>팀 선택</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="탈퇴 처리할 팀 선택" />
                </SelectTrigger>
                <SelectContent>
                  {activeTeams.map((team) => (
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
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>탈퇴 사유</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 팀원 부족, 개인 사정, 규정 위반 등"
                rows={3}
              />
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-2 rounded space-y-1">
              <div>탈퇴 처리 시 자동으로:</div>
              <ul className="list-disc list-inside pl-2">
                <li>향후 모든 scheduled 경기가 cancelled로 변경됩니다</li>
                <li>순위표에서 (탈퇴) 표시가 나타납니다</li>
                <li>팀명에 취소선이 표시됩니다</li>
              </ul>
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
            <Button
              variant="destructive"
              onClick={handleWithdraw}
              disabled={loading}
            >
              {loading ? "처리 중..." : "탈퇴 처리"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
