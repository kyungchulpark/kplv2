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
          <CardTitle>Champion / Awards Admin</CardTitle>
          <CardDescription>Source data is missing.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const safeSeasons = seasons ?? [];
  const safeTeams = teams ?? [];
  const safePlayers = players ?? [];
  const safeHistory = recentHistory ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Champion / Awards Admin</h1>
          <p className="text-muted-foreground">
            Record championships, runner-ups, and MVPs for each season.
          </p>
        </div>
      </div>

      <ChampionshipManager
        seasons={safeSeasons as any}
        teams={safeTeams as any}
        players={safePlayers as any}
        defaultSeasonId={safeSeasons[0]?.id}
      />

      <Card>
        <CardHeader>
          <CardTitle>Recent Champions</CardTitle>
          <CardDescription>Latest five entries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {safeHistory.length > 0 ? (
            safeHistory.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded border p-3"
              >
                <div>
                  <p className="font-semibold">{item.season_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Champion: {item.champion_team_name} / Runner-up:{" "}
                    {item.runner_up_team_name || "-"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.championship_date).toLocaleDateString("en-US")}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No championship records yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
