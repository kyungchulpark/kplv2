import { createClient } from "@/utils/supabase/server";
import { StandingsTable } from "@/components/standings/standings-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function StandingsPage() {
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
            <CardTitle>순위표</CardTitle>
            <CardDescription>진행 중인 시즌이 없습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get teams with their standings
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("season_id", activeSeason.id)
    .order("wins", { ascending: false });

  // Get all finished matches for calculating recent form
  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .eq("season_id", activeSeason.id)
    .eq("status", "finished")
    .order("match_date", { ascending: false });

  // Calculate recent form for each team (last 5 games)
  const teamsWithForm =
    teams?.map((team) => {
      const teamMatches = matches?.filter(
        (m) => m.home_team_id === team.id || m.away_team_id === team.id
      );

      const recentFive = (teamMatches || []).slice(0, 5).map((match) => {
        const isHome = match.home_team_id === team.id;
        const teamScore = isHome ? match.home_score : match.away_score;
        const opponentScore = isHome ? match.away_score : match.home_score;
        return teamScore! > opponentScore! ? "W" : "L";
      });

      return {
        ...team,
        recentForm: recentFive,
      };
    }) || [];

  // Separate by conference and calculate stats
  const westTeams = teamsWithForm
    .filter((t) => t.conference === "West")
    .map((team) => ({
      ...team,
      gamesPlayed: team.wins + team.losses,
      winRate:
        team.wins + team.losses === 0
          ? 0
          : (team.wins / (team.wins + team.losses)) * 100,
      margin:
        team.wins + team.losses === 0
          ? 0
          : (team.points_for - team.points_against) / (team.wins + team.losses),
      ppg:
        team.wins + team.losses === 0
          ? 0
          : team.points_for / (team.wins + team.losses),
      papg:
        team.wins + team.losses === 0
          ? 0
          : team.points_against / (team.wins + team.losses),
    }))
    .sort((a, b) => {
      // NEW Ranking: Points > Head-to-head (TODO) > Avg Points Scored
      if (b.points !== a.points) return b.points - a.points;
      // TODO: Add head-to-head comparison here
      if (b.ppg !== a.ppg) return b.ppg - a.ppg;
      return b.points_for - a.points_for;
    });

  const eastTeams = teamsWithForm
    .filter((t) => t.conference === "East")
    .map((team) => ({
      ...team,
      gamesPlayed: team.wins + team.losses,
      winRate:
        team.wins + team.losses === 0
          ? 0
          : (team.wins / (team.wins + team.losses)) * 100,
      margin:
        team.wins + team.losses === 0
          ? 0
          : (team.points_for - team.points_against) / (team.wins + team.losses),
      ppg:
        team.wins + team.losses === 0
          ? 0
          : team.points_for / (team.wins + team.losses),
      papg:
        team.wins + team.losses === 0
          ? 0
          : team.points_against / (team.wins + team.losses),
    }))
    .sort((a, b) => {
      // NEW Ranking: Points > Head-to-head (TODO) > Avg Points Scored
      if (b.points !== a.points) return b.points - a.points;
      // TODO: Add head-to-head comparison here
      if (b.ppg !== a.ppg) return b.ppg - a.ppg;
      return b.points_for - a.points_for;
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            순위표
          </h1>
          <p className="text-xl text-muted-foreground">{activeSeason.name}</p>
        </div>

        {/* Conference Standings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Western Conference */}
          <Card className="border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
                <span className="text-2xl">Western Conference</span>
              </CardTitle>
              <CardDescription>상위 8팀 플레이오프 진출</CardDescription>
            </CardHeader>
            <CardContent>
              <StandingsTable teams={westTeams} />
            </CardContent>
          </Card>

          {/* Eastern Conference */}
          <Card className="border-nba-red/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="h-1 w-12 bg-nba-red rounded-full"></div>
                <span className="text-2xl">Eastern Conference</span>
              </CardTitle>
              <CardDescription>상위 8팀 플레이오프 진출</CardDescription>
            </CardHeader>
            <CardContent>
              <StandingsTable teams={eastTeams} />
            </CardContent>
          </Card>
        </div>

        {/* Legend */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span>승리 (W)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span>패배 (L)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded bg-primary/10 border border-primary flex items-center justify-center text-xs font-bold">
                  1-8
                </div>
                <span>플레이오프 진출권</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
