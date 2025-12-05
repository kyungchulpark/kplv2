import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { TeamsManager } from "@/components/admin/teams-manager";

export default async function TeamsAdminPage() {
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
        <h1 className="text-3xl font-bold">Teams</h1>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              활성화된 시즌이 없습니다. 먼저 시즌을 생성하세요.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      *,
      captain:profiles!teams_captain_id_fkey(psn_id),
      _rosters:team_rosters(count)
    `
    )
    .eq("season_id", activeSeason.id)
    .order("wins", { ascending: false });

  // Transform data for component
  const teamsWithCount = teams?.map((team) => ({
    ...team,
    roster_count: team._rosters?.[0]?.count || 0,
  })) || [];

  return (
    <TeamsManager
      teams={teamsWithCount}
      seasonId={activeSeason.id}
      seasonName={activeSeason.name}
    />
  );
}
