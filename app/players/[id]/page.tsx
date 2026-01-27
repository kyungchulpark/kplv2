import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield, Trophy, Activity, Calendar } from "lucide-react";
import Link from "next/link";
import { PlayerStatsBySeason } from "@/components/players/player-stats-by-season";

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

    // Get PSN ID history for legacy match linking
    const { data: psnHistory } = await supabase
        .from("psn_id_history")
        .select("old_psn_id, new_psn_id")
        .eq("user_id", id);

    const psnIds = new Set<string>();
    if (profile.psn_id) {
        psnIds.add(profile.psn_id);
    }

    (psnHistory || []).forEach((entry: any) => {
        if (entry.old_psn_id) psnIds.add(entry.old_psn_id);
        if (entry.new_psn_id) psnIds.add(entry.new_psn_id);
    });

    const normalizedPsnIds = Array.from(psnIds)
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
        .map((value) => value.toLowerCase());

    let legacyProfileIds: string[] = [];

    if (normalizedPsnIds.length > 0) {
        const { data: legacyProfiles } = await supabase
            .from("old_profiles")
            .select("id, psn_id_normalized")
            .in("psn_id_normalized", normalizedPsnIds);

        legacyProfileIds = (legacyProfiles || []).map((profile: any) => profile.id);
    }

    // Get active season
    const { data: activeSeason } = await supabase
        .from("seasons")
        .select("*")
        .eq("is_active", true)
        .single();

    // Get all seasons for season selector
    const { data: allSeasons } = await supabase
        .from("seasons")
        .select("id, name")
        .order("start_date", { ascending: false });

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

    // Get player stats (all seasons) with season info
    const { data: matchStats } = await supabase
        .from("match_stats")
        .select(`
      *,
      match:matches!match_stats_match_id_fkey(
        id,
        match_date,
        season_id,
        home_team:teams!matches_home_team_id_fkey(name, id),
        away_team:teams!matches_away_team_id_fkey(name, id)
      )
    `)
        .eq("player_id", id)
        .order("created_at", { ascending: false });

    // Get legacy stats mapped by PSN IDs (old_profiles -> old_match_stats)
    let legacyStats: any[] = [];
    if (legacyProfileIds.length > 0) {
        const { data: legacyData } = await supabase
            .from("old_match_stats")
            .select(`
        id,
        team_id,
        pts,
        reb,
        ast,
        stl,
        blk,
        fgm,
        fga,
        three_pm,
        three_pa,
        grade,
        match:matches!old_match_stats_match_id_fkey(
          id,
          match_date,
          season_id,
          home_team:teams!matches_home_team_id_fkey(name, id),
          away_team:teams!matches_away_team_id_fkey(name, id)
        )
      `)
            .in("old_profile_id", legacyProfileIds);

        legacyStats = legacyData || [];
    }

    const combinedStats = [...(matchStats || []), ...(legacyStats || [])];
    combinedStats.sort((a: any, b: any) => {
        const aTime = new Date(a.match?.match_date || 0).getTime();
        const bTime = new Date(b.match?.match_date || 0).getTime();
        return bTime - aTime;
    });

    // Calculate averages
    const totalGames = combinedStats.length || 0;
    const averages = combinedStats.reduce(
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

                {/* Detailed Stats with Season Filter */}
                <PlayerStatsBySeason
                    seasons={allSeasons || []}
                    stats={combinedStats as any || []}
                    teamId={team?.id}
                    teamName={team?.name}
                />
            </div>
        </div>
    );
}
