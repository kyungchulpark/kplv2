import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Trophy, Activity, Calendar } from "lucide-react";
import Link from "next/link";

interface PageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function PlayerProfilePage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // Get player profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

    if (!profile) {
        notFound();
    }

    // Get active season
    const { data: activeSeason } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_active", true)
        .single();

    // Get team info
    let team = null;
    let isCaptain = false;

    if (activeSeason) {
        // Check if captain
        const { data: captainTeam } = await supabase
            .from("teams")
            .select("*")
            .eq("captain_id", id)
            .eq("season_id", activeSeason.id)
            .single();

        if (captainTeam) {
            team = captainTeam;
            isCaptain = true;
        } else {
            // Check if roster member
            const { data: rosterMember } = await supabase
                .from("team_rosters")
                .select("team:teams(*)")
                .eq("player_id", id)
                .eq("season_id", activeSeason.id)
                .eq("is_active", true)
                .single();

            if (rosterMember) {
                team = (rosterMember as any).team;
            }
        }
    }

    // Get player stats for active season
    const { data: stats } = await supabase
        .from("match_stats")
        .select(`
      *,
      match:matches!match_stats_match_id_fkey(
        id,
        match_date,
        home_team:teams!matches_home_team_id_fkey(name),
        away_team:teams!matches_away_team_id_fkey(name)
      )
    `)
        .eq("player_id", id)
        .order("created_at", { ascending: false });

    // Calculate averages
    const totalGames = stats?.length || 0;
    const averages = stats?.reduce(
        (acc, curr) => ({
            pts: acc.pts + curr.pts,
            reb: acc.reb + curr.reb,
            ast: acc.ast + curr.ast,
            stl: acc.stl + curr.stl,
            blk: acc.blk + curr.blk,
        }),
        { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
    );

    if (totalGames > 0 && averages) {
        averages.pts = Number((averages.pts / totalGames).toFixed(1));
        averages.reb = Number((averages.reb / totalGames).toFixed(1));
        averages.ast = Number((averages.ast / totalGames).toFixed(1));
        averages.stl = Number((averages.stl / totalGames).toFixed(1));
        averages.blk = Number((averages.blk / totalGames).toFixed(1));
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Profile Header */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-background shadow-xl">
                                <AvatarImage src={profile.avatar_url || undefined} />
                                <AvatarFallback className="text-2xl md:text-4xl">
                                    {profile.psn_id.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 text-center md:text-left space-y-2">
                                <div className="flex items-center justify-center md:justify-start gap-2">
                                    <h1 className="text-3xl font-bold">{profile.psn_id}</h1>
                                    {isCaptain && (
                                        <Badge variant="secondary" className="gap-1">
                                            <Shield className="h-3 w-3 text-yellow-500" />
                                            Captain
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                    <Badge variant="outline">{profile.role}</Badge>
                                    {team ? (
                                        <Link href={`/teams/${team.id}`}>
                                            <Badge className="hover:bg-primary/90 cursor-pointer">
                                                {team.name}
                                            </Badge>
                                        </Link>
                                    ) : (
                                        <Badge variant="secondary">Free Agent</Badge>
                                    )}
                                </div>
                            </div>

                            {/* Season Averages */}
                            {totalGames > 0 && (
                                <div className="grid grid-cols-3 gap-4 text-center bg-muted/50 p-4 rounded-xl">
                                    <div>
                                        <div className="text-xs text-muted-foreground font-bold">PPG</div>
                                        <div className="text-2xl font-bold text-primary">{averages?.pts}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground font-bold">RPG</div>
                                        <div className="text-2xl font-bold">{averages?.reb}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-muted-foreground font-bold">APG</div>
                                        <div className="text-2xl font-bold">{averages?.ast}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Stats */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Recent Games */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5" />
                                최근 경기 기록
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {totalGames === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    경기 기록이 없습니다.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-2">날짜/상대</th>
                                                <th className="text-center px-2">PTS</th>
                                                <th className="text-center px-2">REB</th>
                                                <th className="text-center px-2">AST</th>
                                                <th className="text-center px-2">STL</th>
                                                <th className="text-center px-2">BLK</th>
                                                <th className="text-center px-2">FG</th>
                                                <th className="text-center px-2">3P</th>
                                                <th className="text-center px-2">평점</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats?.map((stat: any) => (
                                                <tr key={stat.id} className="border-b hover:bg-muted/50">
                                                    <td className="py-3 px-2">
                                                        <div className="font-medium">
                                                            {new Date(stat.match.match_date).toLocaleDateString()}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            vs {stat.match.home_team.name === team?.name
                                                                ? stat.match.away_team.name
                                                                : stat.match.home_team.name}
                                                        </div>
                                                    </td>
                                                    <td className="text-center font-bold">{stat.pts}</td>
                                                    <td className="text-center">{stat.reb}</td>
                                                    <td className="text-center">{stat.ast}</td>
                                                    <td className="text-center">{stat.stl}</td>
                                                    <td className="text-center">{stat.blk}</td>
                                                    <td className="text-center text-xs">
                                                        {stat.fgm}/{stat.fga}
                                                    </td>
                                                    <td className="text-center text-xs">
                                                        {stat.three_pm}/{stat.three_pa}
                                                    </td>
                                                    <td className="text-center">
                                                        {stat.grade ? (
                                                            <Badge variant="outline" className="text-xs">
                                                                {stat.grade}
                                                            </Badge>
                                                        ) : (
                                                            "-"
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
