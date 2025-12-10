import { createClient } from "@/utils/supabase/server";
import { PlayoffManager } from "@/components/admin/playoff-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default async function AdminPlayoffsPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Playoffs</CardTitle>
          <CardDescription>진행 중인 시즌이 없습니다.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data: brackets } = await supabase
    .from("playoff_brackets")
    .select("*")
    .eq("season_id", season.id);

  const westBracket = brackets?.find((b) => b.bracket_type === "west");
  const eastBracket = brackets?.find((b) => b.bracket_type === "east");

  let westSeries: any[] = [];
  let eastSeries: any[] = [];

  if (westBracket) {
    const { data } = await supabase
      .from("playoff_series")
      .select(
        `
        *,
        team1:team1_id(id, name, logo_url),
        team2:team2_id(id, name, logo_url)
      `
      )
      .eq("bracket_id", westBracket.id)
      .order("round_number", { ascending: true })
      .order("series_number", { ascending: true });

    westSeries = data || [];
  }

  if (eastBracket) {
    const { data } = await supabase
      .from("playoff_series")
      .select(
        `
        *,
        team1:team1_id(id, name, logo_url),
        team2:team2_id(id, name, logo_url)
      `
      )
      .eq("bracket_id", eastBracket.id)
      .order("round_number", { ascending: true })
      .order("series_number", { ascending: true });

    eastSeries = data || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Playoffs 관리</h1>
          <p className="text-muted-foreground">{season.name}</p>
        </div>
      </div>

      <PlayoffManager
        seasonId={season.id}
        westSeries={westSeries}
        eastSeries={eastSeries}
      />
    </div>
  );
}
