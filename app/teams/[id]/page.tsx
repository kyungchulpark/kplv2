import { createClient, getCurrentUser } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Calendar, Settings } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TeamDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

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

  // Get recent matches (시즌이 배정된 경우만)
  let recentMatches = null;
  if (team.season_id) {
    const { data } = await supabase
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
    recentMatches = data;
  }

  const gamesPlayed = team.wins + team.losses;
  const winRate = gamesPlayed > 0 ? ((team.wins / gamesPlayed) * 100).toFixed(1) : "0.0";
  const avgScored = gamesPlayed > 0 ? (team.points_for / gamesPlayed).toFixed(1) : "0.0";
  const avgAgainst = gamesPlayed > 0 ? (team.points_against / gamesPlayed).toFixed(1) : "0.0";
  const margin = gamesPlayed > 0 ? ((team.points_for - team.points_against) / gamesPlayed).toFixed(1) : "0.0";

  // Check if current user is captain
  const isCaptain = user && (team.captain_id === user.id);

  const { data: championships } = await supabase
    .from("season_champions")
    .select(
      `
      id,
      championship_date,
      season:seasons(
        name
      )
    `
    )
    .eq("champion_team_id", id)
    .order("championship_date", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Manage Button for Captain */}
        {isCaptain && (
          <div className="flex justify-end">
            <Link href={`/teams/${id}/manage`}>
              <Button>
                <Settings className="mr-2 h-4 w-4" />
                Manage Team
              </Button>
            </Link>
          </div>
        )}

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
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-4xl font-bold">{team.name}</h1>
                  {team.conference ? (
                    <Badge
                      variant="outline"
                      className={
                        team.conference === "West"
                          ? "border-red-500 text-red-500"
                          : "border-blue-500 text-blue-500"
                      }
                    >
                      {team.conference}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-orange-500 text-orange-500">
                      리그 참가 대기
                    </Badge>
                  )}
                </div>
                {team.region && (
                  <p className="text-muted-foreground">{team.region}</p>
                )}
                <p className="text-lg text-muted-foreground">
                  {team.season?.name || "리그 참가 대기"}
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
                      <p className="text-sm text-muted-foreground">Captain</p>
                      <p className="font-semibold">{team.captain.psn_id}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Wins</p>
                  <div className="text-2xl font-bold">{team.wins}</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Losses</p>
                  <div className="text-2xl font-bold">{team.losses}</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Win Rate</p>
                  <div className="text-2xl font-bold">{winRate}%</div>
                </div>
                <div className="text-center p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Point Margin</p>
                  <div className="text-2xl font-bold">{margin > 0 ? "+" : ""}{margin}</div>
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
                <span>Roster</span>
              </CardTitle>
              <CardDescription>
                {roster?.length || 0} active players
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
                  No players registered.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Team Stats & Recent Matches */}
          <div className="space-y-6">
            {/* Team Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Season Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Games Played</span>
                  <span className="font-semibold">{gamesPlayed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points For (avg)</span>
                  <span className="font-semibold">{avgScored}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Points Against (avg)</span>
                  <span className="font-semibold">{avgAgainst}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Points</span>
                  <span className="font-semibold">{team.points_for}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Against</span>
                  <span className="font-semibold">{team.points_against}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Championship History</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {championships && championships.length > 0 ? (
                  championships.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="font-semibold">{entry.season?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.championship_date
                            ? new Date(entry.championship_date).toLocaleDateString("en-US")
                            : "Date TBD"}
                        </p>
                      </div>
                      <Badge variant="secondary">Champion</Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No championships recorded for this team yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Recent Matches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Recent Results</span>
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
                    No finished games yet.
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
