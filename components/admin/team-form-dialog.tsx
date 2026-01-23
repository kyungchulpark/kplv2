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
};

type TeamFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team?: Team | null;
  mode: "create" | "edit";
  seasonId: string;
};

type Profile = {
  id: string;
  psn_id: string;
  email: string;
};

export function TeamFormDialog({
  open,
  onOpenChange,
  team,
  mode,
  seasonId,
}: TeamFormDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    conference: "West",
    logo_url: "",
    captain_id: "",
  });

  // team이 변경될 때 formData 리셋
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || "",
        conference: team.conference || "West",
        logo_url: team.logo_url || "",
        captain_id: team.captain_id || "",
      });
    } else {
      setFormData({
        name: "",
        conference: "West",
        logo_url: "",
        captain_id: "",
      });
    }
  }, [team, open]);

  useEffect(() => {
    const loadProfiles = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, psn_id, email")
        .order("psn_id");

      if (data) setProfiles(data);
    };

    if (open) {
      loadProfiles();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();

      if (mode === "create") {
        const { error } = await supabase.from("teams").insert({
          season_id: seasonId,
          name: formData.name,
          conference: formData.conference,
          logo_url: formData.logo_url || null,
          captain_id: formData.captain_id || null,
          wins: 0,
          losses: 0,
          points_for: 0,
          points_against: 0,
        });

        if (error) throw error;
        toast.success("팀이 생성되었습니다");
      } else {
        const { error } = await supabase
          .from("teams")
          .update({
            name: formData.name,
            conference: formData.conference,
            logo_url: formData.logo_url || null,
            captain_id: formData.captain_id || null,
          })
          .eq("id", team!.id);

        if (error) throw error;
        toast.success("팀이 수정되었습니다");
      }

      onOpenChange(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("파일 크기는 2MB 이하여야 합니다");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("team-logos").getPublicUrl(fileName);

      setFormData({ ...formData, logo_url: publicUrl });
      toast.success("로고가 업로드되었습니다");
    } catch (error: any) {
      toast.error(error.message || "로고 업로드 실패");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {mode === "create" ? "새 팀 생성" : "팀 수정"}
            </DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "새로운 팀 정보를 입력하세요"
                : "팀 정보를 수정하세요"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">팀 이름 *</Label>
              <Input
                id="name"
                placeholder="예: Lakers"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="conference">Conference</Label>
              <Select
                value={formData.conference || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, conference: value === "none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Conference</SelectItem>
                  <SelectItem value="West">Western Conference</SelectItem>
                  <SelectItem value="East">Eastern Conference</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="captain">주장</Label>
              <Select
                value={formData.captain_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, captain_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="주장 선택 (선택사항)" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.psn_id} ({profile.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logo">팀 로고</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
              />
              {formData.logo_url && (
                <div className="flex items-center space-x-2">
                  <img
                    src={formData.logo_url}
                    alt="Team logo preview"
                    className="h-12 w-12 object-contain border rounded"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData({ ...formData, logo_url: "" })}
                  >
                    제거
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                PNG, JPG, WEBP (최대 2MB)
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
