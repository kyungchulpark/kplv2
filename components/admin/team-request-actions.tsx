"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle } from "lucide-react";

type TeamRequestActionsProps = {
  requestId: string;
  teamName: string;
  seasonId: string | null;
  requesterId: string;
  conference: string;
  logoUrl: string | null;
};

export function TeamRequestActions({
  requestId,
  teamName,
  seasonId,
  requesterId,
  conference,
  logoUrl,
}: TeamRequestActionsProps) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = async () => {
    setLoading(true);

    try {
      const supabase = createClient();

      // Get current user (reviewer)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증이 필요합니다");

      // Create team (리그 참가 대기 상태로 생성)
      const { data: newTeam, error: teamError } = await supabase
        .from("teams")
        .insert({
          season_id: seasonId,
          name: teamName,
          conference: null, // 관리자가 컨퍼런스 추첨으로 배정
          logo_url: logoUrl,
          captain_id: requesterId,
          is_active: false, // 리그 참가 대기 상태
          wins: 0,
          losses: 0,
          points_for: 0,
          points_against: 0,
        })
        .select()
        .single();

      if (teamError) {
        // Translate common database errors to Korean
        const errorMsg = teamError.message.includes("violates not-null constraint")
          ? "데이터베이스 제약 조건 오류: 필수 값이 누락되었습니다. 관리자에게 문의하세요."
          : teamError.message.includes("duplicate key")
          ? "이미 같은 이름의 팀이 존재합니다."
          : teamError.message;
        throw new Error(errorMsg);
      }

      // Update request status
      const { error: updateError } = await supabase
        .from("team_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw new Error("요청 상태 업데이트 실패: " + updateError.message);

      toast.success(`${teamName} 팀이 승인되었습니다`);
      setApproveOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "승인 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("거부 사유를 입력해주세요");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // Get current user (reviewer)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("인증이 필요합니다");

      // Update request status
      const { error } = await supabase
        .from("team_requests")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("요청이 거부되었습니다");
      setRejectOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "거부 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex space-x-2 pt-2">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700"
          onClick={() => setApproveOpen(true)}
        >
          <CheckCircle className="mr-2 h-4 w-4" />
          Approve
        </Button>
        <Button
          variant="destructive"
          className="flex-1"
          onClick={() => setRejectOpen(true)}
        >
          <XCircle className="mr-2 h-4 w-4" />
          Reject
        </Button>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 승인</DialogTitle>
            <DialogDescription>
              {teamName} 팀을 승인하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              승인하면 새로운 팀이 생성되며, 요청자가 주장으로 설정됩니다.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              onClick={handleApprove}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "처리 중..." : "승인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀 신청 거부</DialogTitle>
            <DialogDescription>
              {teamName} 팀 신청을 거부하는 사유를 입력하세요
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">거부 사유 *</Label>
              <Textarea
                id="reason"
                placeholder="거부 사유를 입력하세요..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? "처리 중..." : "거부"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
