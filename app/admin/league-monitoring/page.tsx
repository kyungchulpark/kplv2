import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "League Monitoring - KPL Admin",
};

export const revalidate = 30;

type ActivityLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  actor: {
    psn_id: string | null;
  } | null;
};

export default async function LeagueMonitoringPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select(
      `
      id,
      action,
      entity_type,
      entity_id,
      details,
      created_at,
      actor:profiles!activity_logs_actor_id_fkey(
        psn_id
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const getSummary = (log: ActivityLog) => {
    const details = log.details || {};
    switch (log.action) {
      case "team_created":
        return `${details.team_name || "Team"} created`;
      case "roster_added":
        return `${details.player_psn_id || "Player"} added to ${details.team_name || "team"}`;
      case "roster_removed":
        return `${details.player_psn_id || "Player"} removed from ${details.team_name || "team"}`;
      case "match_result_create":
        return `Match result submitted: ${details.home_team_name || "Home"} vs ${details.away_team_name || "Away"}`;
      case "match_result_update":
        return `Match result updated: ${details.home_team_name || "Home"} vs ${details.away_team_name || "Away"}`;
      case "match_forfeit":
        return `Forfeit declared: ${details.home_team_name || "Home"} vs ${details.away_team_name || "Away"}`;
      default:
        return log.action;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">League Monitoring</h1>
        <p className="text-sm text-muted-foreground">
          Recent match result activity across the league.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs && logs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {(logs as ActivityLog[]).map((log) => {
                    const timeText = log.created_at
                      ? new Date(log.created_at).toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "-";
                    const actionLabel = log.action?.toUpperCase() ?? "ACTION";
                    return (
                      <tr key={log.id} className="border-b">
                        <td className="py-3 pr-4 whitespace-nowrap">{timeText}</td>
                        <td className="py-3 pr-4">
                          {log.actor?.psn_id || "Unknown"}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="outline">{actionLabel}</Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="font-medium">{getSummary(log)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No activity logs yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
