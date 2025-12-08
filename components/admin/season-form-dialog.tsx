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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Season = {
  id: string;
  name: string;
  game_version?: string | null;
  start_date: string;
  end_date: string | null;
  playoff_cutoff: number;
  is_active: boolean;
};

type SeasonFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  season?: Season | null;
  mode: "create" | "edit";
};

export function SeasonFormDialog({
  open,
  onOpenChange,
  season,
  mode,
}: SeasonFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: season?.name || "",
    game_version: season?.game_version || "",
    start_date: season?.start_date || "",
    end_date: season?.end_date || "",
    playoff_cutoff: season?.playoff_cutoff || 8,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "create") {
        const { error } = await supabase.from("seasons").insert({
          name: formData.name,
          game_version: formData.game_version,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          playoff_cutoff: formData.playoff_cutoff,
          is_active: false,
        });

        if (error) throw error;
        toast.success("시즌이 생성되었습니다");
      } else {
        const { error } = await supabase
          .from("seasons")
          .update({
            name: formData.name,
            game_version: formData.game_version,
            start_date: formData.start_date,
            end_date: formData.end_date || null,
            playoff_cutoff: formData.playoff_cutoff,
          })
          .eq("id", season!.id);

        if (error) throw error;
        toast.success("시즌이 수정되었습니다");
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "새 시즌 생성" : "시즌 수정"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "새로운 시즌 정보를 입력하세요"
                : "시즌 정보를 수정하세요"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">시즌 이름 *</Label>
              <Input
                id="name"
                placeholder="예: 2K26 1st Season"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="game_version">버전</Label>
              <Input
                id="game_version"
                placeholder="예: 2K26, v1.0"
                value={formData.game_version}
                onChange={(e) =>
                  setFormData({ ...formData, game_version: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_date">시작일 *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) =>
                    setFormData({ ...formData, start_date: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="end_date">종료일</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, end_date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="playoff_cutoff">플레이오프 진출 팀 수</Label>
              <Input
                id="playoff_cutoff"
                type="number"
                min="1"
                max="16"
                value={formData.playoff_cutoff}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    playoff_cutoff: parseInt(e.target.value),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                각 컨퍼런스에서 진출할 팀 수 (기본: 8팀)
              </p>
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
