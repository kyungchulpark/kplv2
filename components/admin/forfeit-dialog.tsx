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
import { Flag } from "lucide-react";

interface Match {
  id: string;
  home_team_id: string;
  away_team_id: string;
  home_team_name: string;
  away_team_name: string;
  match_date: string;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  is_forfeit?: boolean | null;
  forfeit_winner_id?: string | null;
  forfeit_reason?: string | null;
}

interface ForfeitDialogProps {
  match: Match;
  onSuccess?: () => void;
}

export function ForfeitDialog({ match, onSuccess }: ForfeitDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [winnerId, setWinnerId] = useState<string>("");
  const [reason, setReason] = useState("");

  const supabase = createClient();

  const handleDeclareForfeit = async () => {
    if (!winnerId) {
      toast.error("몰수승 팀을 선택해주세요");
      return;
    }

    if (!reason.trim()) {
      toast.error("몰수 사유를 입력해주세요");
      return;
    }

    if (
      !confirm(
        `정말 이 경기를 몰수로 처리하시겠습니까?\n\n승리: ${
          winnerId === match.home_team_id
            ? match.home_team_name
            : match.away_team_name
        }\n사유: ${reason}`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const beforeMatch = {
        status: match.status,
        home_score: match.home_score ?? null,
        away_score: match.away_score ?? null,
        is_forfeit: match.is_forfeit ?? false,
        forfeit_winner_id: match.forfeit_winner_id ?? null,
        forfeit_reason: match.forfeit_reason ?? null,
      };

      // Update match as forfeit
      const { error } = await supabase
        .from("matches")
        .update({
          is_forfeit: true,
          forfeit_winner_id: winnerId,
          forfeit_reason: reason.trim(),
          status: "finished",
          // Set scores to 0-0 or leave null for forfeit
          home_score: 0,
          away_score: 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (error) throw error;

      const { data: authData } = await supabase.auth.getUser();
      const editorId = authData.user?.id;
      if (editorId) {
        const { error: auditError } = await supabase
          .from("match_result_audits")
          .insert({
            match_id: match.id,
            editor_id: editorId,
            action: "forfeit",
            before_match: beforeMatch,
            after_match: {
              status: "finished",
              home_score: 0,
              away_score: 0,
              is_forfeit: true,
              forfeit_winner_id: winnerId,
              forfeit_reason: reason.trim(),
            },
          });
        if (auditError) {
          console.error("Error writing forfeit audit:", auditError);
        }

        const { error: activityError } = await supabase
          .from("activity_logs")
          .insert({
            actor_id: editorId,
            action: "match_forfeit",
            entity_type: "match",
            entity_id: match.id,
            details: {
              match_id: match.id,
              home_team_name: match.home_team_name,
              away_team_name: match.away_team_name,
              forfeit_reason: reason.trim(),
            },
          });
        if (activityError) {
          console.error("Error writing activity log:", activityError);
        }
      }

      toast.success("경기가 몰수로 처리되었습니다");

      setWinnerId("");
      setReason("");
      setOpen(false);

      if (onSuccess) onSuccess();
    } catch (error: any) {
      console.error("Error declaring forfeit:", error);
      toast.error("몰수 처리 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Flag className="h-4 w-4 mr-1" />
          몰수 처리
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>경기 몰수 처리</DialogTitle>
          <DialogDescription>
            한 팀이 경기에 출전하지 않거나 규정 위반으로 몰수패가 선언됩니다.
            <br />
            <span className="text-sm text-muted-foreground">
              승리팀: +2점 (승점), 패배팀: +0점 (승점)
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Match Info */}
          <div className="rounded-lg border p-3 space-y-1">
            <div className="text-sm text-muted-foreground">경기 정보</div>
            <div className="font-semibold">
              {match.home_team_name} vs {match.away_team_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(match.match_date).toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>

          {/* Winner Selection */}
          <div className="space-y-2">
            <Label>몰수승 팀 선택</Label>
            <Select value={winnerId} onValueChange={setWinnerId}>
              <SelectTrigger>
                <SelectValue placeholder="승리 팀 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={match.home_team_id}>
                  {match.home_team_name} (홈)
                </SelectItem>
                <SelectItem value={match.away_team_id}>
                  {match.away_team_name} (어웨이)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>몰수 사유</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 상대팀 무단 불참, 규정 위반 등"
              rows={3}
            />
          </div>

          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            주의: 몰수 처리된 경기는 선수 개인 스탯이 기록되지 않습니다.
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
          <Button onClick={handleDeclareForfeit} disabled={loading}>
            {loading ? "처리 중..." : "몰수 처리"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
