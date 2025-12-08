import { createClient } from "@/utils/supabase/server";
import { TeamsManagerWithFilter } from "@/components/admin/teams-manager-with-filter";

export default async function TeamsAdminPage() {
  const supabase = await createClient();

  // Get all seasons
  const { data: seasons } = await supabase
    .from("seasons")
    .select("*")
    .order("created_at", { ascending: false });

  // Get all teams with season info
  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      *,
      season:seasons(id, name),
      captain:profiles!teams_captain_id_fkey(psn_id),
      _rosters:team_rosters(count)
    `
    )
    .order("name", { ascending: true });

  // Transform data for component
  const teamsWithCount = teams?.map((team) => ({
    ...team,
    roster_count: team._rosters?.[0]?.count || 0,
  })) || [];

  return (
    <TeamsManagerWithFilter
      teams={teamsWithCount}
      seasons={seasons || []}
    />
  );
}
