import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Shield, Users } from "lucide-react";
import { PlayersClient } from "@/components/players/players-client";

export const metadata = {
  title: "Players - KPL",
  description: "All registered players in KPL",
};

export default async function PlayersPage() {
  const supabase = await createClient();
  const currentUser = await getCurrentUser();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  // Get all users with their team info
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("psn_id", { ascending: true });

  // Enrich with team data
  const playersWithTeams = await Promise.all(
    (profiles || []).map(async (profile) => {
      // Check if captain
      const { data: captainTeam } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .eq("captain_id", profile.id)
        .eq("season_id", activeSeason?.id || "")
        .single();

      // Check if roster member
      const { data: rosterTeam } = await supabase
        .from("team_rosters")
        .select("team:teams(id, name, logo_url)")
        .eq("player_id", profile.id)
        .eq("season_id", activeSeason?.id || "")
        .eq("is_active", true)
        .single();

      return {
        ...profile,
        team: captainTeam || (rosterTeam as any)?.team || null,
        isCaptain: !!captainTeam,
      };
    })
  );

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
