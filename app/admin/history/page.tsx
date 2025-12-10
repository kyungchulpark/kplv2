import { createClient } from "@/utils/supabase/server";
import { ChampionshipManager } from "@/components/admin/championship-manager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default async function AdminHistoryPage() {
  const supabase = await createClient();

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name")
    .order("start_date", { ascending: false });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .order("name");

  const { data: players } = await supabase
    .from("profiles")
    .select("id, psn_id")
    .order("psn_id");

  const { data: recentHistory } = await supabase
    .from("championship_history")
    .select("*")
    .order("championship_date", { ascending: false })
    .limit(5);

  if (!seasons || !teams || !players) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>연혁/시상 관리</CardTitle>
          <CardDescription>기초 데이터가 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">연혁/시상 관리</h1>
          <p className="text-muted-foreground">
            시즌별 우승/준우승/MVP 및 시상 데이터 입력
          </p>
        </div>
      </div>

      <ChampionshipManager
        seasons={seasons as any}
        teams={teams as any}
        players={players as any}
        defaultSeasonId={seasons[0]?.id}
      />

      <Card>
        <CardHeader>
          <CardTitle>최근 우승 기록</CardTitle>
          <CardDescription>상위 5개만 표시됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentHistory && recentHistory.length > 0 ? (
            recentHistory.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div>
                  <p className="font-semibold">{item.season_name}</p>
                  <p className="text-sm text-muted-foreground">
                    챔피언: {item.champion_team_name} / 준우승:{" "}
                    {item.runner_up_team_name || "-"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.championship_date).toLocaleDateString("ko-KR")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 입력된 우승 기록이 없습니다.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
