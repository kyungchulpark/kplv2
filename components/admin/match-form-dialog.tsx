"use client";

import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Match = {
  id: string;
  match_date: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  match_sequence: string | null;
  game_password: string | null;
};

type MatchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match?: Match | null;
  mode: "create" | "edit";
  seasonId: string;
};

type Team = {
  id: string;
  name: string;
  conference: string;
};

export function MatchFormDialog({
  open,
  onOpenChange,
  match,
  mode,
  seasonId,
}: MatchFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    match_date: match?.match_date?.split("T")[0] || "",
    match_time: match?.match_date
      ? new Date(match.match_date).toTimeString().substring(0, 5)
      : "22:40",
    home_team_id: match?.home_team_id || "",
    away_team_id: match?.away_team_id || "",
    status: match?.status || "scheduled",
    home_score: match?.home_score?.toString() || "",
    away_score: match?.away_score?.toString() || "",
    match_sequence: match?.match_sequence || "",
    game_password: match?.game_password || "",
  });

  useEffect(() => {
    const loadTeams = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("teams")
        .select("id, name, conference")
        .eq("season_id", seasonId)
        .order("name");

      if (data) setTeams(data);
    };

    if (open) {
      loadTeams();
    }
  }, [open, seasonId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      // Combine date and time - Convert KST to UTC
      // Add +09:00 to explicitly mark as KST, then convert to UTC
      const kstDateTime = `${formData.match_date}T${formData.match_time}:00+09:00`;
      const matchDateTime = new Date(kstDateTime).toISOString();

      const matchData = {
        season_id: seasonId,
        match_date: matchDateTime,
        home_team_id: formData.home_team_id,
        away_team_id: formData.away_team_id,
        status: formData.status,
        home_score: formData.home_score ? parseInt(formData.home_score) : null,
        away_score: formData.away_score ? parseInt(formData.away_score) : null,
        match_sequence: formData.match_sequence || null,
        game_password: formData.game_password || null,
      };

      if (mode === "create") {
        const { error } = await supabase.from("matches").insert(matchData);

        if (error) throw error;
        toast.success("경기가 생성되었습니다");
      } else {
        const { error } = await supabase
          .from("matches")
          .update(matchData)
          .eq("id", match!.id);

        if (error) throw error;
        toast.success("경기가 수정되었습니다");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "새 경기 생성" : "경기 수정"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "새로운 경기 정보를 입력하세요"
                : "경기 정보를 수정하세요"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="match_date">경기 날짜 *</Label>
                <Input
                  id="match_date"
                  type="date"
                  value={formData.match_date}
                  onChange={(e) =>
                    setFormData({ ...formData, match_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="match_time">경기 시간 *</Label>
                <Select
                  value={formData.match_time}
                  onValueChange={(value) =>
                    setFormData({ ...formData, match_time: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="22:40">22:40</SelectItem>
                    <SelectItem value="23:20">23:20</SelectItem>
                    <SelectItem value="custom">직접 입력</SelectItem>
                  </SelectContent>
                </Select>
                {formData.match_time === "custom" && (
                  <Input
                    type="time"
                    value={formData.match_time}
                    onChange={(e) =>
                      setFormData({ ...formData, match_time: e.target.value })
                    }
                  />
                )}
              </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="home_team">홈 팀 *</Label>
                <Select
                  value={formData.home_team_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, home_team_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="홈 팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.conference})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="away_team">어웨이 팀 *</Label>
                <Select
                  value={formData.away_team_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, away_team_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="어웨이 팀 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.conference})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status */}
            <div className="grid gap-2">
              <Label htmlFor="status">경기 상태</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">예정</SelectItem>
                  <SelectItem value="live">진행 중</SelectItem>
                  <SelectItem value="finished">종료</SelectItem>
                  <SelectItem value="cancelled">취소</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scores (only if finished) */}
            {formData.status === "finished" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="home_score">홈 팀 점수</Label>
                  <Input
                    id="home_score"
                    type="number"
                    min="0"
                    value={formData.home_score}
                    onChange={(e) =>
                      setFormData({ ...formData, home_score: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="away_score">어웨이 팀 점수</Label>
                  <Input
                    id="away_score"
                    type="number"
                    min="0"
                    value={formData.away_score}
                    onChange={(e) =>
                      setFormData({ ...formData, away_score: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Match Sequence */}
            <div className="grid gap-2">
              <Label htmlFor="match_sequence">경기 시퀀스</Label>
              <Input
                id="match_sequence"
                placeholder="예: 20250417_001"
                value={formData.match_sequence}
                onChange={(e) =>
                  setFormData({ ...formData, match_sequence: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                형식: YYYYMMDD_XXX (예: 20250417_001)
              </p>
            </div>

            {/* Game Password */}
            <div className="grid gap-2">
              <Label htmlFor="game_password">게임 비밀번호</Label>
              <Input
                id="game_password"
                type="text"
                placeholder="선택사항"
                value={formData.game_password}
                onChange={(e) =>
                  setFormData({ ...formData, game_password: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "처리 중..." : mode === "create" ? "생성" : "수정"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
