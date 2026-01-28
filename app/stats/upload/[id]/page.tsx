import { redirect } from "next/navigation";
import { MatchStatsInput } from "@/components/admin/match-stats-input";
import { createClient, getCurrentUser } from "@/utils/supabase/server";
import { canUserUploadMatchResult } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchResultUploadPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: match } = await supabase
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
        ),
        season:seasons(
          id,
          name
        )
      `
    )
    .eq("id", id)
    .single();

  if (!match) {
    redirect("/stats/upload");
  }

  // Check user permission to upload results for this match
  const permission = await canUserUploadMatchResult(
    user.id,
    id,
    (match as any).season_id
  );

  if (!permission.canUpload) {
    // User does not have permission - show error message
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>{permission.reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You do not have permission to upload results for this match. Only players on the participating teams can submit results.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((match as any).status === "finished") {
    redirect("/schedule");
  }

  // Check if match stats already exist (prevent duplicate entries)
  const { data: existingStats } = await supabase
    .from("match_stats")
    .select("id")
    .eq("match_id", id)
    .limit(1);

  if (existingStats && existingStats.length > 0) {
    // Stats already exist - redirect to schedule
    return (
      <div className="container mx-auto px-4 py-10">
        <Card className="border-amber-500">
          <CardHeader>
            <CardTitle>Results Already Submitted</CardTitle>
            <CardDescription>
              Match results have already been submitted for this game.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you need to modify the results, please contact an admin.
            </p>
            <a href="/schedule" className="text-primary hover:underline">
              Return to Schedule →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: homeRoster } = await supabase
    .from("team_rosters")
    .select(
      `
        player_id,
        jersey_number,
        position,
        profiles:player_id(
          id,
          psn_id
        )
      `
    )
    .eq("team_id", (match as any).home_team_id)
    .eq("season_id", (match as any).season_id)
    .eq("is_active", true);

  const { data: awayRoster } = await supabase
    .from("team_rosters")
    .select(
      `
        player_id,
        jersey_number,
        position,
        profiles:player_id(
          id,
          psn_id
        )
      `
    )
    .eq("team_id", (match as any).away_team_id)
    .eq("season_id", (match as any).season_id)
    .eq("is_active", true);

  return (
    <div className="container mx-auto px-4 py-10">
      <MatchStatsInput
        match={match}
        homeRoster={homeRoster || []}
        awayRoster={awayRoster || []}
        onSuccessRedirect="/stats/upload"
      />
    </div>
  );
}
