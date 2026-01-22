import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RosterManagement } from "@/components/team/roster-management";

export default async function TeamManagePage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "captain" && profile.role !== "admin")) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>접근 권한 없음</CardTitle>
            <CardDescription>
              팀장만 이 페이지에 접근할 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name, is_active")
    .eq("is_active", true)
    .maybeSingle();

  // Get team that user is captain of (prefer active season)
  const { data: teams } = await supabase
    .from("teams")
    .select(
      `
      *,
      season:seasons(id, name, is_active)
    `
    )
    .eq("captain_id", user.id)
    .order("created_at", { ascending: false });

  let team = null;
  if (teams && teams.length > 0) {
    team = teams[0];
    if (activeSeason?.id) {
      const activeTeam = teams.find((t) => t.season_id === activeSeason.id);
      if (activeTeam) {
        team = activeTeam;
      }
    }
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>팀 없음</CardTitle>
            <CardDescription>
              팀장으로 등록된 팀이 없습니다. 관리자에게 문의하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get current roster
  const { data: roster } = await supabase
    .from("team_rosters")
    .select(
      `
      *,
      player:profiles!team_rosters_player_id_fkey(
        id,
        psn_id,
        avatar_url,
        email
      )
    `
    )
    .eq("team_id", team.id)
    .eq("is_active", true)
    .order("jersey_number", { ascending: true });

  // Get all available players (users who are not in any active roster for this season)
  const { data: allPlayers } = await supabase
    .from("profiles")
    .select("id, psn_id, email, avatar_url");

  // Filter out players who are already in an active roster for this season
  const { data: activeRosters } = await supabase
    .from("team_rosters")
    .select("player_id, team:teams!team_rosters_team_id_fkey(season_id)")
    .eq("is_active", true);

  const playersInSeason = new Set(
    activeRosters
      ?.filter((r) => r.team?.season_id === team.season_id)
      .map((r) => r.player_id) || []
  );

  const availablePlayers =
    (allPlayers || [])
      .filter((p) => !playersInSeason.has(p.id))
      .sort((a, b) =>
        (a.psn_id || "").localeCompare(b.psn_id || "", undefined, {
          sensitivity: "base",
        })
      );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            팀 관리
          </h1>
          <p className="text-xl text-muted-foreground">
            {team.name} - {team.season.name}
          </p>
        </div>

        {/* Roster Management */}
        <RosterManagement
          team={team}
          roster={roster || []}
          availablePlayers={availablePlayers}
        />
      </div>
    </div>
  );
}
