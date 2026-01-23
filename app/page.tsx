import { createClient } from "@/utils/supabase/server";
import { TodayMatches } from "@/components/home/today-matches";
import { UpcomingMatches } from "@/components/home/upcoming-matches";
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
        <HeroSection
          seasonName="KPL"
          teamsCount={0}
          finishedMatches={0}
          scheduleDays="Tue/Thu/Sun"
        />
        <div className="mt-12 text-center">
          <p className="text-xl text-muted-foreground">
            No active season yet. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  // Get recent 20 matches (for NBA-style slider)
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

  // Get upcoming matches (scheduled)
  const { data: upcomingMatches } = await supabase
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
    .eq("status", "scheduled")
    .gte("match_date", new Date().toISOString())
    .order("match_date", { ascending: true })
    .limit(10);

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
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <section className="bg-white shadow-[inset_0_-1px_0_0_rgba(15,23,42,0.05)]">
        <HeroSection
          seasonName={activeSeason.name}
          teamsCount={teamsCount || 0}
          finishedMatches={finishedMatches || 0}
          scheduleDays="Tue/Thu/Sun"
        />
      </section>

      <div className="container mx-auto px-4 py-16 space-y-12">
        {upcomingMatches && upcomingMatches.length > 0 && (
          <section className="rounded-3xl border border-blue-100 bg-blue-50/40 p-8 shadow-sm">
            <UpcomingMatches matches={upcomingMatches} />
          </section>
        )}

        <section className="rounded-3xl border border-slate-100 bg-white/90 p-8 shadow-sm">
          <TodayMatches matches={recentMatches || []} />
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/90 p-8 shadow-sm">
          <LeagueLeaders
            scoringLeaders={scoringLeaders || []}
            assistLeaders={assistLeaders || []}
            reboundLeaders={reboundLeaders || []}
            seasonName={activeSeason.name}
          />
        </section>
      </div>
    </div>
  );
}
