import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConferenceDrawClient } from "@/components/admin/conference-draw-client";
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "컨퍼런스 배정 - KPL Admin",
  description: "시즌 컨퍼런스 수동 배정",
};

export default async function ConferenceDrawPage() {
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
        <div>
          <h1 className="text-3xl font-bold">컨퍼런스 배정</h1>
          <p className="text-muted-foreground">팀 컨퍼런스 수동 배정</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>활성화된 시즌이 없습니다.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Get all teams (not filtered by season) so existing teams can be assigned to new seasons
  const { data: allTeams } = await supabase
    .from("teams")
    .select("*")
    .order("name", { ascending: true });

  // Separate teams: only teams in current season are active, rest are inactive
  const activeTeams = allTeams?.filter((t) =>
    t.season_id === activeSeason.id && t.is_active !== false
  ) || [];
  const inactiveTeams = allTeams?.filter((t) =>
    t.season_id !== activeSeason.id || t.is_active === false
  ) || [];

  const westTeams = activeTeams.filter((t) => t.conference === "West");
  const eastTeams = activeTeams.filter((t) => t.conference === "East");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">컨퍼런스 배정</h1>
        <p className="text-muted-foreground">
          {activeSeason.name} - 팀 컨퍼런스 수동 배정
        </p>
      </div>

      {/* Current State */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>현재 상태</CardTitle>
            <CardDescription>추첨 전 컨퍼런스 배정</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Western Conference</h3>
                <div className="space-y-1">
                  {westTeams.map((team) => (
                    <div
                      key={team.id}
                      className="text-sm p-2 rounded bg-muted flex items-center gap-2"
                    >
                      {team.logo_url && (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-5 w-5 object-contain"
                        />
                      )}
                      {team.name}
                    </div>
                  ))}
                  {westTeams.length === 0 && (
                    <p className="text-sm text-muted-foreground">팀 없음</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Eastern Conference</h3>
                <div className="space-y-1">
                  {eastTeams.map((team) => (
                    <div
                      key={team.id}
                      className="text-sm p-2 rounded bg-muted flex items-center gap-2"
                    >
                      {team.logo_url && (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-5 w-5 object-contain"
                        />
                      )}
                      {team.name}
                    </div>
                  ))}
                  {eastTeams.length === 0 && (
                    <p className="text-sm text-muted-foreground">팀 없음</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>통계</CardTitle>
            <CardDescription>현재 컨퍼런스 분포</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">리그 참가 팀</span>
                <span className="text-2xl font-bold">{activeTeams.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">대기 팀</span>
                <span className="text-xl font-semibold text-muted-foreground">{inactiveTeams.length}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-medium">Western</span>
                <span className="text-xl font-semibold">{westTeams.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Eastern</span>
                <span className="text-xl font-semibold">{eastTeams.length}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t">
                <span className="text-sm font-medium">조 균형</span>
                <span className="text-sm text-muted-foreground">
                  {Math.abs(westTeams.length - eastTeams.length) === 0
                    ? "완벽"
                    : Math.abs(westTeams.length - eastTeams.length) === 1
                      ? "양호"
                      : "불균형"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Management & Draw Action */}
      <ConferenceDrawClient
        seasonId={activeSeason.id}
        seasonName={activeSeason.name}
        activeTeams={activeTeams}
        inactiveTeams={inactiveTeams}
      />
    </div>
  );
}
