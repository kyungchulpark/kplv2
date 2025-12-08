import { createClient } from "@/utils/supabase/server";
import { TeamsManagerSimple } from "@/components/admin/teams-manager-simple";

export default async function TeamsAdminPage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  // Get all unique teams (by name), preferring those in active season
  const { data: allTeams } = await supabase
    .from("teams")
    .select(
      `
      *,
      season:seasons(id, name, is_active),
      captain:profiles!teams_captain_id_fkey(psn_id),
      _rosters:team_rosters(count)
    `
    )
    .order("name", { ascending: true });

  // Transform data for component
  const teamsWithCount = allTeams?.map((team) => ({
    ...team,
    roster_count: team._rosters?.[0]?.count || 0,
    is_current_season: team.season_id === activeSeason?.id,
  })) || [];

  return (
    <TeamsManagerSimple
      teams={teamsWithCount}
      activeSeason={activeSeason}
    />
  );
}
