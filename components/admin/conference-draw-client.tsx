"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, CheckCircle, Loader2, Save, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  conference: "West" | "East" | null;
  is_active: boolean;
}

interface ConferenceDrawClientProps {
  seasonId: string;
  seasonName: string;
  activeTeams: Team[];
  inactiveTeams: Team[];
}

export function ConferenceDrawClient({
  seasonId,
  seasonName,
  activeTeams: initialActiveTeams,
  inactiveTeams: initialInactiveTeams,
}: ConferenceDrawClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [teams, setTeams] = useState([...initialActiveTeams, ...initialInactiveTeams]);
  const [hasChanges, setHasChanges] = useState(false);

  // 컨퍼런스 변경
  const handleConferenceChange = (teamId: string, conference: "West" | "East" | "none") => {
    setTeams(teams.map(team => {
      if (team.id === teamId) {
        return { ...team, conference: conference === "none" ? null : conference };
      }
      return team;
    }));
    setHasChanges(true);
  };

  // 리그 참가 여부 변경
  const handleActiveChange = (teamId: string, isActive: boolean) => {
    setTeams(teams.map(team => {
      if (team.id === teamId) {
        return { ...team, is_active: isActive };
      }
      return team;
    }));
    setHasChanges(true);
  };

  // 변경사항 저장
  const handleSave = async () => {
    setSaving(true);

    try {
      const supabase = createClient();

      // 모든 팀 업데이트
      const updates = teams.map((team) =>
        supabase
          .from("teams")
          .update({
            conference: team.conference,
            is_active: team.is_active
          })
          .eq("id", team.id)
      );

      await Promise.all(updates);

      toast.success("컨퍼런스 설정이 저장되었습니다!");
      setHasChanges(false);
      router.refresh();
    } catch (error: any) {
      toast.error(`저장 실패: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // 통계 계산
  const activeTeams = teams.filter(t => t.is_active);
  const westTeams = activeTeams.filter(t => t.conference === "West");
  const eastTeams = activeTeams.filter(t => t.conference === "East");
  const unassignedTeams = activeTeams.filter(t => !t.conference);

  return (
    <div className="space-y-6">
      {/* 저장 버튼 */}
      {hasChanges && (
        <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-700 dark:text-blue-400">
              변경사항이 있습니다. 저장해주세요.
            </span>
            <Button onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  변경사항 저장
                </>
              )}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 통계 카드 */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{activeTeams.length}</div>
              <p className="text-sm text-muted-foreground">리그 참가</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{westTeams.length}</div>
              <p className="text-sm text-muted-foreground">Western</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{eastTeams.length}</div>
              <p className="text-sm text-muted-foreground">Eastern</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{unassignedTeams.length}</div>
              <p className="text-sm text-muted-foreground">미배정</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 균형 체크 */}
      {activeTeams.length > 0 && Math.abs(westTeams.length - eastTeams.length) > 1 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            컨퍼런스 불균형: Western {westTeams.length}팀, Eastern {eastTeams.length}팀
            (차이: {Math.abs(westTeams.length - eastTeams.length)})
          </AlertDescription>
        </Alert>
      )}

      {unassignedTeams.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            {unassignedTeams.length}개 팀이 컨퍼런스에 배정되지 않았습니다.
          </AlertDescription>
        </Alert>
      )}

      {/* 팀 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            팀 컨퍼런스 배정
          </CardTitle>
          <CardDescription>
            각 팀의 컨퍼런스를 선택하세요. 리그에 참가하지 않는 팀은 "미참가"로 설정하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${!team.is_active ? "bg-muted/50 opacity-60" :
                    team.conference === "West" ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20" :
                      team.conference === "East" ? "border-red-300 bg-red-50/50 dark:bg-red-950/20" :
                        "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20"
                  }`}
              >
                <div className="flex items-center gap-3">
                  {team.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="h-8 w-8 object-contain"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold">
                      {team.name.substring(0, 2)}
                    </div>
                  )}
                  <span className="font-medium">{team.name}</span>
                  {!team.is_active && (
                    <Badge variant="outline" className="text-xs">미참가</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* 리그 참가 여부 */}
                  <Select
                    value={team.is_active ? "active" : "inactive"}
                    onValueChange={(value) => handleActiveChange(team.id, value === "active")}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">참가</SelectItem>
                      <SelectItem value="inactive">미참가</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* 컨퍼런스 선택 */}
                  <Select
                    value={team.conference || "none"}
                    onValueChange={(value) => handleConferenceChange(team.id, value as "West" | "East" | "none")}
                    disabled={!team.is_active}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="컨퍼런스" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">미배정</SelectItem>
                      <SelectItem value="West">
                        <span className="text-blue-600">Western</span>
                      </SelectItem>
                      <SelectItem value="East">
                        <span className="text-red-600">Eastern</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}

            {teams.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                등록된 팀이 없습니다.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 (하단) */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                변경사항 저장
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
