import { createClient } from "@/utils/supabase/server";
import { ScheduleView } from "@/components/schedule/schedule-view";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { startOfDay } from "date-fns";

export default async function SchedulePage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>No active season.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get all matches for active season
  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      *,
      home_team:teams!matches_home_team_id_fkey(
        id,
        name,
        logo_url,
        conference
      ),
      away_team:teams!matches_away_team_id_fkey(
        id,
        name,
        logo_url,
        conference
      )
    `
    )
    .eq("season_id", activeSeason.id)
    .order("match_date", { ascending: true });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Schedule</h1>
          <p className="text-xl text-muted-foreground">
            {activeSeason.name} - Tue/Thu/Sun 22:40, 23:20
          </p>
        </div>

        {/* Schedule View with Tabs */}
        <ScheduleView
          matches={matches || []}
          initialSelectedDate={getInitialDate(matches || [])}
          leagueEnded={isLeagueEnded(matches || [])}
        />
      </div>
    </div>
  );
}

function getInitialDate(matches: any[]): string {
  if (!matches || matches.length === 0) return "";
  const today = startOfDay(new Date()).getTime();
  const futureDates = matches
    .map((m) => new Date(m.match_date).getTime())
    .filter((t) => t >= today)
    .sort((a, b) => a - b);

  if (futureDates.length > 0) {
    return new Date(futureDates[0]).toISOString().split("T")[0];
  }

  // No future matches: pick last match date
  const last = matches[matches.length - 1];
  return last.match_date.split("T")[0];
}

function isLeagueEnded(matches: any[]): boolean {
  if (!matches || matches.length === 0) return true;
  const today = startOfDay(new Date()).getTime();
  const hasFuture = matches.some((m) => new Date(m.match_date).getTime() >= today);
  return !hasFuture;
}
