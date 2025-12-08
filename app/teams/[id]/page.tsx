import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, TrendingUp, Calendar } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get team details
  const { data: team } = await supabase
    .from("teams")
    .select(
      `
      *,
      season:seasons(
        id,
        name
      ),
      captain:profiles!teams_captain_id_fkey(
        id,
        psn_id,
        avatar_url,
        email
      )
    `
    )
    .eq("id", id)
    .single();

  if (!team) {
    redirect("/teams");
  }

  // Get team roster
  const { data: roster } = await supabase
    .from("team_rosters")
    .select(
      `
      *,
      player:profiles!team_rosters_player_id_fkey(
        id,
        psn_id,
        avatar_url
      )
    `
    )
    .eq("team_id", id)
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  // Get recent matches
  const { data: recentMatches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
    `
    )
    .eq("season_id", team.season_id)
    .or(`home_team_id.eq.${id},away_team_id.eq.${id}`)
    .eq("status", "finished")
    .order("match_date", { ascending: false })
    .limit(5);

  const gamesPlayed = team.wins + team.losses;
  const winRate = gamesPlayed > 0 ? ((team.wins / gamesPlayed) * 100).toFixed(1) : "0.0";
  const avgScored = gamesPlayed > 0 ? (team.points_for / gamesPlayed).toFixed(1) : "0.0";
  const avgAgainst = gamesPlayed > 0 ? (team.points_against / gamesPlayed).toFixed(1) : "0.0";
  const margin = gamesPlayed > 0 ? ((team.points_for - team.points_against) / gamesPlayed).toFixed(1) : "0.0";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Team Header */}
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Logo */}
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="h-32 w-32 object-contain"
                />
              ) : (
                <div className="h-32 w-32 rounded-2xl bg-nba-red flex items-center justify-center text-4xl font-bold text-white">
                  {team.name.substring(0, 2).toUpperCase()}
                </div>
              )}

              {/* Team Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <h1 className="text-4xl font-bold">{team.name}</h1>
                  {team.conference && (
                    <Badge
                      variant="outline"
                      className={
                        team.conference === "West"
                          ? "border-blue-500 text-blue-500"
                          : "border-red-500 text-red-500"
                      }
                    >
                      {team.conference}
                    </Badge>
                  )}
                </div>
                {team.region && (
                  <p className="text-muted-foreground">{team.region}</p>
                )}
                <p className="text-lg text-muted-foreground">
                  {team.season.name}
                </p>

                {/* Captain */}
                {team.captain && (
                  <div className="flex items-center space-x-3 pt-2 border-t">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={team.captain.avatar_url || undefined} />
                      <AvatarFallback>
                        {team.captain.psn_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">팀장</p>
                      <p className="font-semibold">{team.captain.psn_id}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                  <div className="text-2xl font-bold">{team.wins}</div>
                  <div className="text-xs text-muted-foreground">승</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{team.losses}</div>
                  <div className="text-xs text-muted-foreground">패</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{winRate}%</div>
                  <div className="text-xs text-muted-foreground">승률</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 mx-auto mb-1 text-green-500" />
                  <div className="text-2xl font-bold">{margin > 0 ? '+' : ''}{margin}</div>
                  <div className="text-xs text-muted-foreground">득실차</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roster */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>로스터</span>
              </CardTitle>
              <CardDescription>
                {roster?.length || 0}명의 선수
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roster && roster.length > 0 ? (
                <div className="space-y-2">
                  {roster.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarImage src={member.player.avatar_url || undefined} />
                          <AvatarFallback>
                            {member.player.psn_id.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{member.player.psn_id}</p>
                          {member.position && (
                            <p className="text-sm text-muted-foreground">
                              {member.position}
                            </p>
                          )}
                        </div>
                      </div>
                      {member.jersey_number && (
                        <Badge variant="outline">#{member.jersey_number}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  등록된 선수가 없습니다
                </p>
              )}
            </CardContent>
          </Card>

          {/* Team Stats & Recent Matches */}
          <div className="space-y-6">
            {/* Team Stats */}
            <Card>
              <CardHeader>
                <CardTitle>팀 통계</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">경기 수</span>
                  <span className="font-semibold">{gamesPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">평균 득점</span>
                  <span className="font-semibold">{avgScored}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">평균 실점</span>
                  <span className="font-semibold">{avgAgainst}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 득점</span>
                  <span className="font-semibold">{team.points_for}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 실점</span>
                  <span className="font-semibold">{team.points_against}</span>
                </div>
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>최근 경기</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentMatches && recentMatches.length > 0 ? (
                  <div className="space-y-2">
                    {recentMatches.map((match) => {
                      const isHome = match.home_team_id === id;
                      const teamScore = isHome ? match.home_score : match.away_score;
                      const opponentScore = isHome ? match.away_score : match.home_score;
                      const opponent = isHome ? match.away_team : match.home_team;
                      const won = teamScore! > opponentScore!;

                      return (
                        <div
                          key={match.id}
                          className="flex items-center justify-between p-2 rounded text-sm"
                        >
                          <div className="flex items-center space-x-2">
                            <Badge variant={won ? "default" : "destructive"}>
                              {won ? "W" : "L"}
                            </Badge>
                            <span>{opponent.name}</span>
                          </div>
                          <span className="font-semibold">
                            {teamScore} - {opponentScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    경기 기록이 없습니다
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
