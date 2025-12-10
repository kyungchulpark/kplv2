import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PenaltyManager } from "@/components/admin/penalty-manager";
import { WithdrawalManager } from "@/components/admin/withdrawal-manager";
import { TeamResetManager } from "@/components/admin/team-reset-manager";
import { AlertTriangle, UserX } from "lucide-react";

export default async function TeamManagementPage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">팀 관리</h1>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              활성화된 시즌이 없습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get all teams in active season
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, logo_url, penalty_points, is_withdrawn")
    .eq("season_id", activeSeason.id)
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">팀 관리</h1>
        <p className="text-muted-foreground mt-2">
          {activeSeason.name} - 감점 및 탈퇴 관리
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Penalty Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span>감점 관리</span>
            </CardTitle>
            <CardDescription>
              규정 위반 또는 기타 사유로 팀에 감점을 부과하거나 제거합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PenaltyManager
              teams={teams || []}
              seasonId={activeSeason.id}
            />
          </CardContent>
        </Card>

        {/* Withdrawal Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserX className="h-5 w-5 text-muted-foreground" />
              <span>팀 탈퇴 관리</span>
            </CardTitle>
            <CardDescription>
              시즌 중 팀 탈퇴 처리 및 복구를 관리합니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WithdrawalManager
              teams={teams || []}
              seasonId={activeSeason.id}
            />
          </CardContent>
        </Card>

        {/* Team Reset */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <span>팀 경기 리셋</span>
            </CardTitle>
            <CardDescription>
              선택한 팀의 경기 결과/기록을 모두 초기화하고 순위를 다시 계산합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamResetManager
              teams={(teams || []).map((t: any) => ({ id: t.id, name: t.name }))}
              seasonId={activeSeason.id}
            />
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">안내사항</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">감점:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>승점(points)에서 감점(penalty_points)이 차감됩니다</li>
              <li>0.5 단위로 감점을 부과할 수 있습니다</li>
              <li>순위표에서 감점이 별도로 표시됩니다</li>
            </ul>
          </div>
          <div className="mt-3">
            <strong className="text-foreground">팀 탈퇴:</strong>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>향후 모든 scheduled 경기가 자동으로 cancelled로 변경됩니다</li>
              <li>순위표에서 팀명에 취소선과 (탈퇴) 표시가 나타납니다</li>
              <li>이미 완료된 경기 결과는 유지됩니다</li>
              <li>탈퇴 처리된 팀은 복구할 수 있습니다</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
