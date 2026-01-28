import { createClient } from "@/utils/supabase/server";
import TeamRolesManager from "@/components/admin/team-roles-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function TeamRolesPage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Team Roles Management</h1>
          <p className="text-muted-foreground">
            팀 역할 관리 - 주장 및 부주장 권한 부여
          </p>
        </div>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>No Active Season</span>
            </CardTitle>
            <CardDescription>
              현재 활성화된 시즌이 없습니다. 새 시즌을 생성하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get all teams for current season with captain info
  const { data: teams } = await supabase
    .from("teams")
    .select(`
      id, name, season_id, captain_id,
      captain:profiles!teams_captain_id_fkey(id, psn_id, email)
    `)
    .eq("season_id", activeSeason.id)
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Team Roles Management</h1>
        <p className="text-muted-foreground">
          팀 역할 관리 - 주장 및 부주장 권한 부여
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Season: {activeSeason.name}</CardTitle>
          <CardDescription>
            팀 주장과 부주장에게 팀 관리 권한을 부여합니다. 주장이 바쁠 때 부주장이 대신 관리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamRolesManager
            teams={teams || []}
            currentSeasonId={activeSeason.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
