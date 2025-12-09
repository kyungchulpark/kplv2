import { createClient } from "@/utils/supabase/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsTable, PlayerStatRow } from "@/components/stats/stats-table";

export default async function StatsPage() {
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
            <CardTitle>Stats</CardTitle>
            <CardDescription>No active season.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Get finished matches for active season
  const { data: finishedMatches } = await supabase
    .from("matches")
    .select("id")
    .eq("season_id", activeSeason.id)
    .eq("status", "finished");

  const matchIds = (finishedMatches || []).map((m) => m.id);

  let rows: PlayerStatRow[] = [];

  if (matchIds.length > 0) {
    // Get raw match stats with player/team info
    const { data: rawStats } = await supabase
      .from("match_stats")
      .select(
        `
        match_id,
        team_id,
        player_id,
        grade,
        pts,
        reb,
        ast,
        stl,
        blk,
        fls,
        turnovers,
        fgm,
        fga,
        three_pm,
        three_pa,
        ftm,
        fta,
        player:player_id(
          psn_id,
          avatar_url
        ),
        team:team_id(
          name,
          logo_url
        )
      `
      )
      .in("match_id", matchIds);

    const aggregated = new Map<string, PlayerStatRow>();

    (rawStats || []).forEach((stat) => {
      const key = stat.player_id as string;
      const existing = aggregated.get(key);

      const base: PlayerStatRow = existing || {
        player_id: stat.player_id as string,
        psn_id: (stat as any).player?.psn_id || "",
        avatar_url: (stat as any).player?.avatar_url || null,
        team_id: stat.team_id as string | null,
        team_name: (stat as any).team?.name || "Unknown",
        team_logo_url: (stat as any).team?.logo_url || null,
        games_played: 0,
        grade: null,
        pts: 0,
        reb: 0,
        ast: 0,
        stl: 0,
        blk: 0,
        fls: 0,
        turnovers: 0,
        fgm: 0,
        fga: 0,
        three_pm: 0,
        three_pa: 0,
        ftm: 0,
        fta: 0,
      };

      aggregated.set(key, {
        ...base,
        games_played: base.games_played + 1,
        grade: (stat as any).grade ?? base.grade,
        pts: base.pts + (stat as any).pts,
        reb: base.reb + (stat as any).reb,
        ast: base.ast + (stat as any).ast,
        stl: base.stl + (stat as any).stl,
        blk: base.blk + (stat as any).blk,
        fls: base.fls + (stat as any).fls,
        turnovers: base.turnovers + (stat as any).turnovers,
        fgm: base.fgm + (stat as any).fgm,
        fga: base.fga + (stat as any).fga,
        three_pm: base.three_pm + (stat as any).three_pm,
        three_pa: base.three_pa + (stat as any).three_pa,
        ftm: base.ftm + (stat as any).ftm,
        fta: base.fta + (stat as any).fta,
      });
    });

    rows = Array.from(aggregated.values());
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">
            Stats
          </h1>
          <p className="text-xl text-muted-foreground">
            {activeSeason.name} - Player stats from match results
          </p>
        </div>

        <StatsTable rows={rows} />
      </div>
    </div>
  );
}
