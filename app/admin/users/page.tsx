import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UsersManager } from "@/components/admin/users-manager";

export default async function UsersAdminPage() {
  const supabase = await createClient();

  // Get all users with their profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  // Get team counts for each user
  const profilesWithTeams = await Promise.all(
    (profiles || []).map(async (profile) => {
      // Check if user is captain of any team
      const { data: captainTeams } = await supabase
        .from("teams")
        .select("id, name")
        .eq("captain_id", profile.id);

      // Check if user is in any team roster
      const { data: rosterTeams } = await supabase
        .from("team_rosters")
        .select("team:teams(id, name)")
        .eq("player_id", profile.id)
        .eq("is_active", true);

      return {
        ...profile,
        captain_of: captainTeams || [],
        member_of: rosterTeams?.map((r: any) => r.team) || [],
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">사용자 관리</h1>
        <p className="text-muted-foreground">
          전체 사용자: {profiles?.length || 0}명
        </p>
      </div>

      <UsersManager users={profilesWithTeams} />
    </div>
  );
}
