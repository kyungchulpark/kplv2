import { createClient } from "@/utils/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { MatchesManager } from "@/components/admin/matches-manager";

export default async function MatchesAdminPage() {
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
        <h1 className="text-3xl font-bold">Matches</h1>
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

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(name, logo_url),
      away_team:teams!matches_away_team_id_fkey(name, logo_url)
    `
    )
    .eq("season_id", (activeSeason as any).id)
    .order("match_date", { ascending: false });

  return (
    <MatchesManager
      matches={matches || []}
      seasonId={(activeSeason as any).id}
      seasonName={(activeSeason as any).name}
    />
  );
}
