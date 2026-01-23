import { createClient } from "@/utils/supabase/server";
import { TeamCard } from "@/components/teams/team-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function TeamsPage() {
  const supabase = await createClient();

  // Get active season (optional, for marking active teams)
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .maybeSingle();

  // Get ALL teams (regardless of season), excluding disbanded teams
  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      *,
      captain:profiles!teams_captain_id_fkey(
        id,
        psn_id,
        avatar_url
      ),
      _rosters:team_rosters(count),
      season:seasons(name)
    `
    )
    .or("is_disbanded.is.null,is_disbanded.eq.false")
    .order("name", { ascending: true }); // Sort alphabetically by team name

  // Get championship counts for each team
  const { data: championshipData } = await supabase
    .from("season_champions")
    .select("champion_team_id");

  // Create a map of team_id to championship count
  const championshipCounts = new Map<string, number>();
  championshipData?.forEach((record) => {
    const count = championshipCounts.get(record.champion_team_id) || 0;
    championshipCounts.set(record.champion_team_id, count + 1);
  });

  // Add championship count and active status to each team
  const teamsWithData = teams?.map((team) => ({
    ...team,
    championships: championshipCounts.get(team.id) || 0,
    isActiveLeague: !!(activeSeason && team.season_id === activeSeason.id && team.is_active),
  })) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-4xl font-bold">All Teams</h1>
          <p className="text-xl text-muted-foreground">
            {activeSeason ? `Current Season: ${activeSeason.name}` : "No active season"} • {teamsWithData.length} {teamsWithData.length === 1 ? "team" : "teams"}
          </p>
        </div>

        {teamsWithData.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamsWithData.map((team) => (
              <TeamCard key={team.id} team={team} showActiveLeagueBadge={true} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No teams yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
