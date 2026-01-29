import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users } from "lucide-react";
import { PlayersClient } from "@/components/players/players-client";

export const metadata = {
  title: "Players - KPL",
  description: "All registered players in KPL",
};

export const revalidate = 60;

export default async function PlayersPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  // Get all users with their team info
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, psn_id, email, avatar_url, role, created_at")
    .order("psn_id", { ascending: true });

  const seasonId = activeSeason?.id;
  const captainTeams = seasonId
    ? await supabase
        .from("teams")
        .select("id, name, logo_url, captain_id")
        .eq("season_id", seasonId)
    : { data: [] as any[] };

  const rosterTeams = seasonId
    ? await supabase
        .from("team_rosters")
        .select("player_id, team:teams(id, name, logo_url)")
        .eq("season_id", seasonId)
        .eq("is_active", true)
    : { data: [] as any[] };

  const captainByPlayer = new Map<string, { id: string; name: string; logo_url: string | null }>();
  (captainTeams.data || []).forEach((team: any) => {
    if (team.captain_id) {
      captainByPlayer.set(team.captain_id, {
        id: team.id,
        name: team.name,
        logo_url: team.logo_url,
      });
    }
  });

  const rosterByPlayer = new Map<string, { id: string; name: string; logo_url: string | null }>();
  (rosterTeams.data || []).forEach((row: any) => {
    if (row.player_id && row.team) {
      rosterByPlayer.set(row.player_id, row.team);
    }
  });

  const playersWithTeams = (profiles || []).map((profile) => {
    const captainTeam = captainByPlayer.get(profile.id) || null;
    const rosterTeam = rosterByPlayer.get(profile.id) || null;
    return {
      ...profile,
      team: captainTeam || rosterTeam,
      isCaptain: !!captainTeam,
    };
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Players</h1>
          <p className="text-muted-foreground">
            All registered players in KPL - {activeSeason?.name || "No active season"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{playersWithTeams.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Teams</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {playersWithTeams.filter((p) => p.team).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Free Agents</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {playersWithTeams.filter((p) => !p.team).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Players List (Client Component for search) */}
        <PlayersClient
          players={playersWithTeams}
          isAdmin={currentUser?.profile?.role === "admin"}
        />
      </div>
    </div>
  );
}
