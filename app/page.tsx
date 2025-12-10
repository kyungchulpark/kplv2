import { createClient } from "@/utils/supabase/server";
import { TodayMatches } from "@/components/home/today-matches";
import { LeagueLeaders } from "@/components/home/league-leaders";
import { HeroSection } from "@/components/home/hero-section";

export default async function Home() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="container mx-auto px-4 py-16">
        <HeroSection seasonName="KPL" teamsCount={0} finishedMatches={0} scheduleDays="Tue/Thu/Sun" />
        <div className="mt-12 text-center">
          <p className="text-xl text-muted-foreground">
            진행 중인 시즌이 없습니다.
          </p>
        </div>
      </div>
    );
  }

  // 최근 20경기 (NBA 스타일 슬라이드용)
  const { data: recentMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(
        id,
        name,
        logo_url,
        conference
      ),
      away_team:teams!matches_away_team_id_fkey(
        id,
        name,
        logo_url,
        conference
      )
    `
    )
    .eq("season_id", activeSeason.id)
    .eq("status", "finished")
    .order("match_date", { ascending: false })
    .limit(20);

  // Get league leaders (top 5 in each category)
  const { data: scoringLeaders } = await supabase
    .from("player_season_stats")
    .select("*")
    .eq("season_id", activeSeason.id)
    .order("ppg", { ascending: false })
    .limit(5);

  const { data: assistLeaders } = await supabase
    .from("player_season_stats")
    .select("*")
    .eq("season_id", activeSeason.id)
    .order("apg", { ascending: false })
    .limit(5);

  const { data: reboundLeaders } = await supabase
    .from("player_season_stats")
    .select("*")
    .eq("season_id", activeSeason.id)
    .order("rpg", { ascending: false })
    .limit(5);

  // Counts for hero stats
  const { count: teamsCount } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("season_id", activeSeason.id);

  const { count: finishedMatches } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("season_id", activeSeason.id)
    .eq("status", "finished");

  return (
    <div className="min-h-screen">
      <HeroSection
        seasonName={activeSeason.name}
        teamsCount={teamsCount || 0}
        finishedMatches={finishedMatches || 0}
        scheduleDays="Tue/Thu/Sun"
      />

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Today's Matches */}
        <TodayMatches matches={recentMatches || []} />

        {/* League Leaders */}
        <LeagueLeaders
          scoringLeaders={scoringLeaders || []}
          assistLeaders={assistLeaders || []}
          reboundLeaders={reboundLeaders || []}
          seasonName={activeSeason.name}
        />
      </div>
    </div>
  );
}
