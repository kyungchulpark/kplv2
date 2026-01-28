import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, getCurrentUser } from "@/utils/supabase/server";
import { Calendar, CheckCircle, Clock, Info } from "lucide-react";
import { MatchesGroupedView } from "@/components/stats/matches-grouped-view";
import { startOfDay } from "date-fns";

type Match = {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  match_sequence: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
};

const statusCopy: Record<Match["status"], { label: string; variant: "outline" | "secondary" | "destructive" | "default" }> = {
  scheduled: { label: "Scheduled", variant: "outline" },
  live: { label: "LIVE", variant: "default" },
  finished: { label: "Final", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default async function ResultsUploadPage() {
  const user = await getCurrentUser();

  // Check if user is logged in
  if (!user) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>No Active Season</CardTitle>
            <CardDescription>Please create and activate a season before uploading match results.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Permission logic: Show matches based on user role
  // - Admin/Staff: See all scheduled/live matches
  // - Team members: See only their team's scheduled/live matches
  const userRole = (user.profile as any)?.role;
  const isAdminOrStaff = ["admin", "staff"].includes(userRole);

  let matchesQuery = supabase
    .from("matches")
    .select(
      `
        id,
        match_date,
        status,
        match_sequence,
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url, conference),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url, conference)
      `
    )
    .eq("season_id", activeSeason.id)
    .in("status", ["scheduled", "live"])
    .order("match_date", { ascending: true });

  // If not admin/staff, filter to only show matches where user is a team member
  if (!isAdminOrStaff) {
    // Get user's teams
    const { data: userRosters } = await supabase
      .from("team_rosters")
      .select("team_id")
      .eq("player_id", user.id)
      .eq("season_id", activeSeason.id)
      .eq("is_active", true);

    const userTeamIds = userRosters?.map((r) => r.team_id) || [];

    if (userTeamIds.length === 0) {
      // User is not on any team - show empty state
      return (
        <div className="container mx-auto px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Not on a Team</CardTitle>
              <CardDescription>
                You must join a team to upload match results.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // Filter matches where user's team is playing (home or away)
    matchesQuery = matchesQuery.or(
      `home_team_id.in.(${userTeamIds.join(",")}),away_team_id.in.(${userTeamIds.join(",")})`
    );
  }

  const { data: matches } = await matchesQuery;

  // Group matches by date
  const groupedMatches = (matches || []).reduce((acc, match) => {
    const date = match.match_date.split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  const sortedDates = Object.keys(groupedMatches).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Get initial selected date
  const getInitialDate = (): string => {
    if (sortedDates.length === 0) return "";
    const today = startOfDay(new Date()).getTime();
    const futureDates = sortedDates
      .map((d) => new Date(d).getTime())
      .filter((t) => t >= today)
      .sort((a, b) => a - b);

    if (futureDates.length > 0) {
      return new Date(futureDates[0]).toISOString().split("T")[0];
    }

    return sortedDates[sortedDates.length - 1];
  };

  const initialSelectedDate = getInitialDate();

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Upload Match Results</h1>
        <p className="text-muted-foreground">
          Submit {activeSeason.name} match stats to update the stats database instantly.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-emerald-600" />
            <CardTitle>Checklist Before Submission</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">Roster + Scoring Validation</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-[2px]" />
              <span>Verify match date and matchup before submitting</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-[2px]" />
              <span>5 players per team, no duplicates or omissions</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-[2px]" />
              <span>FG/3P/FT attempts ≥ makes, points auto-calculated</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 mt-[2px]" />
              <span>Updates schedule, stats, and standings instantly</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <MatchesGroupedView
        groupedMatches={groupedMatches}
        sortedDates={sortedDates}
        initialSelectedDate={initialSelectedDate}
        statusCopy={statusCopy}
      />
    </div>
  );
}

