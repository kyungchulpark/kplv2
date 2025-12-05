import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, AlertCircle } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  // Get stats
  const { count: totalTeams } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true })
    .eq("season_id", activeSeason?.id || "");

  const { count: pendingRequests } = await supabase
    .from("team_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { data: upcomingMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `
    )
    .eq("season_id", activeSeason?.id || "")
    .eq("status", "scheduled")
    .order("match_date", { ascending: true })
    .limit(5);

  const { data: recentMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(name),
      away_team:teams!matches_away_team_id_fkey(name)
    `
    )
    .eq("season_id", activeSeason?.id || "")
    .eq("status", "finished")
    .order("match_date", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          KPL 관리자 대시보드에 오신 것을 환영합니다
        </p>
      </div>

      {/* Active Season Info */}
      {activeSeason ? (
        <Card className="border-nba-red/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-nba-red" />
              <span>Active Season</span>
            </CardTitle>
            <CardDescription>{activeSeason.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Game Version:</span>
                <p className="font-semibold">{activeSeason.game_version}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Start Date:</span>
                <p className="font-semibold">
                  {new Date(activeSeason.start_date).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">End Date:</span>
                <p className="font-semibold">
                  {new Date(activeSeason.end_date).toLocaleDateString("ko-KR")}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Playoff Cutoff:</span>
                <p className="font-semibold">Top {activeSeason.playoff_cutoff}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>No Active Season</span>
            </CardTitle>
            <CardDescription>
              현재 활성화된 시즌이 없습니다. 새 시즌을 생성하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeams || 0}</div>
            <p className="text-xs text-muted-foreground">
              in {activeSeason?.name || "no season"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground">
              team creation requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Matches
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {upcomingMatches?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">scheduled games</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent and Upcoming Matches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Matches</CardTitle>
            <CardDescription>다가오는 경기 일정</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingMatches && upcomingMatches.length > 0 ? (
              <div className="space-y-2">
                {upcomingMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {match.home_team.name} vs {match.away_team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(match.match_date).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <Badge variant="outline">예정</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                예정된 경기가 없습니다
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Results</CardTitle>
            <CardDescription>최근 경기 결과</CardDescription>
          </CardHeader>
          <CardContent>
            {recentMatches && recentMatches.length > 0 ? (
              <div className="space-y-2">
                {recentMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {match.home_team.name} vs {match.away_team.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(match.match_date).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {match.home_score} - {match.away_score}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        종료
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground py-4">
                최근 경기가 없습니다
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
