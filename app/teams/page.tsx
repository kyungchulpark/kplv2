import { createClient } from "@/utils/supabase/server";
import { TeamCard } from "@/components/teams/team-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TeamsPage() {
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
            <CardTitle>팀 정보</CardTitle>
            <CardDescription>진행 중인 시즌이 없습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get all teams for active season
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
      _rosters:team_rosters(count)
    `
    )
    .eq("season_id", activeSeason.id)
    .order("wins", { ascending: false });

  // Separate by conference if applicable
  const westTeams = teams?.filter((t) => t.conference === "West") || [];
  const eastTeams = teams?.filter((t) => t.conference === "East") || [];
  const unifiedTeams = teams?.filter((t) => !t.conference) || [];

  const hasConferences = westTeams.length > 0 || eastTeams.length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            팀 정보
          </h1>
          <p className="text-xl text-muted-foreground">
            {activeSeason.name} - {teams?.length || 0}개 팀
          </p>
        </div>

        {/* Conference-based or Unified */}
        {hasConferences ? (
          <div className="space-y-8">
            {/* Western Conference */}
            {westTeams.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold">Western Conference</h2>
                  <span className="text-muted-foreground">({westTeams.length}팀)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {westTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </div>
            )}

            {/* Eastern Conference */}
            {eastTeams.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="h-1 w-12 bg-red-500 rounded-full"></div>
                  <h2 className="text-2xl font-bold">Eastern Conference</h2>
                  <span className="text-muted-foreground">({eastTeams.length}팀)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {eastTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Unified League */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unifiedTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}

        {teams && teams.length === 0 && (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">등록된 팀이 없습니다.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
