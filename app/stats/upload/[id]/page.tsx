import { redirect } from "next/navigation";
import { MatchStatsInput } from "@/components/admin/match-stats-input";
import { createClient, getCurrentUser } from "@/utils/supabase/server";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchResultUploadPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user || !["admin", "staff"].includes((user.profile as any)?.role)) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: match } = await supabase
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

  if (!match) {
    redirect("/stats/upload");
  }

  if ((match as any).status === "finished") {
    redirect("/schedule");
  }

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
    <div className="container mx-auto px-4 py-10">
      <MatchStatsInput
        match={match}
        homeRoster={homeRoster || []}
        awayRoster={awayRoster || []}
        onSuccessRedirect="/stats/upload"
      />
    </div>
  );
}
