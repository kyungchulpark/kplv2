import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsLeaderboard } from "@/components/stats/stats-leaderboard";

export default async function StatsPage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>통계</CardTitle>
            <CardDescription>진행 중인 시즌이 없습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get all player stats for active season
  const { data: playerStats } = await supabase
    .from("player_season_stats")
    .select(
      `
      *,
      profile:player_id(
        psn_id,
        avatar_url
      ),
      team:team_id(
        name,
        logo_url
      )
    `
    )
    .eq("season_id", activeSeason.id)
    .gte("games_played", 1);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            통계
          </h1>
          <p className="text-xl text-muted-foreground">
            {activeSeason.name} - 선수 개인 기록
          </p>
        </div>

        {/* Stats Leaderboard with Tabs */}
        <StatsLeaderboard stats={playerStats || []} />
      </div>
    </div>
  );
}
