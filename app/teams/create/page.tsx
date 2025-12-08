"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function CreateTeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createClient();

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      router.push("/auth/signin");
      return;
    }
    setUser(currentUser);

    // Get active season
    const { data: season } = await supabase
      .from("seasons")
      .select("*")
      .eq("is_active", true)
      .single();

    setActiveSeason(season);

    if (!season) {
      setError("현재 활성화된 시즌이 없습니다. 관리자에게 문의하세요.");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        setError("로고 파일은 2MB 이하여야 합니다.");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드 가능합니다.");
        return;
      }

      setLogoFile(file);
      setError(null);

      // Preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // Check if team name already exists
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("id")
        .eq("season_id", activeSeason.id)
        .eq("name", teamName)
        .single();

      if (existingTeam) {
        setError("같은 이름의 팀이 이미 존재합니다.");
        setLoading(false);
        return;
      }

      // Check if user already has a pending request
      const { data: existingRequest } = await supabase
        .from("team_requests")
        .select("id")
        .eq("season_id", activeSeason.id)
        .eq("requester_id", user.id)
        .eq("status", "pending")
        .single();

      if (existingRequest) {
        setError("이미 대기 중인 팀 생성 신청이 있습니다.");
        setLoading(false);
        return;
      }

      // Check if user is already a captain of a team
      const { data: captainTeam } = await supabase
        .from("teams")
        .select("id, name")
        .eq("season_id", activeSeason.id)
        .eq("captain_id", user.id)
        .single();

      if (captainTeam) {
        setError(`이미 팀장으로 등록된 팀이 있습니다: ${captainTeam.name}`);
        setLoading(false);
        return;
      }

      // Check if user is already in a team roster
      const { data: rosterEntry } = await supabase
        .from("team_rosters")
        .select("team:teams(id, name)")
        .eq("season_id", activeSeason.id)
        .eq("player_id", user.id)
        .eq("is_active", true)
        .single();

      if (rosterEntry && (rosterEntry as any).team) {
        setError(`이미 팀에 소속되어 있습니다: ${(rosterEntry as any).team.name}`);
        setLoading(false);
        return;
      }

      // Upload logo if exists
      let logoUrl = null;
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("team-logos")
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error("Logo upload error:", uploadError);
          setError("로고 업로드에 실패했습니다. Storage 버킷이 생성되었는지 확인하세요.");
          setLoading(false);
          return;
        }

        const { data: publicUrlData } = supabase.storage
          .from("team-logos")
          .getPublicUrl(fileName);

        logoUrl = publicUrlData.publicUrl;
      }

      // Create team request (conference will be assigned by admin draw)
      const { error: insertError } = await supabase
        .from("team_requests")
        .insert({
          season_id: activeSeason.id,
          requester_id: user.id,
          team_name: teamName,
          conference: "West", // Default value, will be changed by admin conference draw
          logo_url: logoUrl,
          status: "pending",
        });

      if (insertError) {
        setError(`신청 실패: ${insertError.message}`);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/teams/my-requests");
        }, 2000);
      }
    } catch (err: any) {
      setError(`오류 발생: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">신청 완료</h3>
                <p className="text-sm text-muted-foreground">
                  팀 생성 신청이 접수되었습니다.
                  <br />
                  관리자 승인을 기다려주세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activeSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            현재 활성화된 시즌이 없습니다. 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">팀 생성 신청</h1>
          <p className="text-muted-foreground">
            {activeSeason.name} - 새로운 팀을 생성하려면 아래 정보를 입력하세요
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>팀 정보</CardTitle>
            <CardDescription>
              관리자 승인 후 팀이 생성되며, 자동으로 팀장으로 지정됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Team Name */}
              <div className="space-y-2">
                <Label htmlFor="teamName">팀 이름 *</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="예: Seoul Lakers"
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  고유한 팀 이름을 입력하세요
                </p>
              </div>

              {/* Conference Note */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  컨퍼런스(Western/Eastern)는 시즌 시작 전 관리자의 조 추첨을 통해 자동 배정됩니다.
                </AlertDescription>
              </Alert>

              {/* Logo Upload */}
              <div className="space-y-2">
                <Label htmlFor="logo">팀 로고 (선택사항)</Label>
                <div className="border-2 border-dashed rounded-lg p-6">
                  <input
                    type="file"
                    id="logo"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <label
                    htmlFor="logo"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-24 w-24 object-contain mb-2"
                      />
                    ) : (
                      <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                    )}
                    <p className="text-sm text-center">
                      {logoFile
                        ? logoFile.name
                        : "클릭하여 로고 업로드 (최대 2MB)"}
                    </p>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP 형식 지원
                </p>
              </div>

              {/* Submit */}
              <div className="flex space-x-2">
                <Button
                  type="submit"
                  disabled={loading || !teamName}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      신청 중...
                    </>
                  ) : (
                    "팀 생성 신청"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
