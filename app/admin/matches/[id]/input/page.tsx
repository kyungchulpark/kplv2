import { redirect } from "next/navigation";
import { getCurrentUser, createClient } from "@/utils/supabase/server";
import { MatchStatsInput } from "@/components/admin/match-stats-input";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchInputPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Check authentication and authorization
  if (!user || ((user.profile as any)?.role !== "admin" && (user.profile as any)?.role !== "staff")) {
    redirect("/");
  }

  const supabase = await createClient();

  // Fetch match details
  const { data: match, error: matchError } = await supabase
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
      ),
      season:seasons(
        id,
        name
      )
    `
    )
    .eq("id", id)
    .single();

  if (matchError || !match) {
    redirect("/admin");
  }

  // Check if match is already finished
  if ((match as any).status === "finished") {
    redirect(`/admin/matches/${id}`);
  }

  // Fetch home team roster
  const { data: homeRoster } = await supabase
    .from("team_rosters")
    .select(
      `
      player_id,
      jersey_number,
      position,
      profiles:player_id(
        id,
        psn_id
      )
    `
    )
    .eq("team_id", (match as any).home_team_id)
    .eq("season_id", (match as any).season_id)
    .eq("is_active", true);

  // Fetch away team roster
  const { data: awayRoster } = await supabase
    .from("team_rosters")
    .select(
      `
      player_id,
      jersey_number,
      position,
      profiles:player_id(
        id,
        psn_id
      )
    `
    )
    .eq("team_id", (match as any).away_team_id)
    .eq("season_id", (match as any).season_id)
    .eq("is_active", true);

  return (
    <div className="container mx-auto px-4 py-8">
      <MatchStatsInput
        match={match}
        homeRoster={homeRoster || []}
        awayRoster={awayRoster || []}
      />
    </div>
  );
}
