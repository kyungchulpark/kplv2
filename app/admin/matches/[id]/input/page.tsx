import { redirect } from "next/navigation";
import { getCurrentUser, createClient } from "@/utils/supabase/server";
import { MatchStatsInput } from "@/components/admin/match-stats-input";

type ExistingStatRow = {
  player_id: string;
  team_id: string;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  fls: number | null;
  fgm: number | null;
  fga: number | null;
  three_pm: number | null;
  three_pa: number | null;
  ftm: number | null;
  fta: number | null;
  turnovers: number | null;
};

type StatRosterRow = {
  team_id: string;
  player_id: string;
  profiles: {
    id: string;
    psn_id: string;
  } | null;
};

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchInputPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Check authentication and authorization
  if (!user || ((user.profile as any)?.role !== "admin" && (user.profile as any)?.role !== "staff")) {
    redirect("/");
  }

  const supabase = await createClient();

  // Fetch match details
  const { data: match, error: matchError } = await supabase
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

  if (matchError || !match) {
    redirect("/admin");
  }

  const matchRecord = match as any;

  const { data: existingStatsRaw } = await supabase
    .from("match_stats")
    .select(
      "player_id, team_id, pts, reb, ast, stl, blk, fls, fgm, fga, three_pm, three_pa, ftm, fta, turnovers"
    )
    .eq("match_id", id);

  const existingStats = (existingStatsRaw || []) as ExistingStatRow[];

  const { data: statPlayersRaw } = await supabase
    .from("match_stats")
    .select(
      `
        team_id,
        player_id,
        profiles:player_id(
          id,
          psn_id
        )
      `
    )
    .eq("match_id", id);

  const statPlayers = (statPlayersRaw || []) as StatRosterRow[];

  const toInitialStats = (rows: ExistingStatRow[]) =>
    rows.map((row) => ({
      player_id: row.player_id,
      pts: row.pts ?? 0,
      reb: row.reb ?? 0,
      ast: row.ast ?? 0,
      stl: row.stl ?? 0,
      blk: row.blk ?? 0,
      fouls: row.fls ?? 0,
      fgm: row.fgm ?? 0,
      fga: row.fga ?? 0,
      tpm: row.three_pm ?? 0,
      tpa: row.three_pa ?? 0,
      ftm: row.ftm ?? 0,
      fta: row.fta ?? 0,
      turnovers: row.turnovers ?? 0,
      grade: "",
    }));

  const initialHomeStats = toInitialStats(
    existingStats.filter((row) => row.team_id === matchRecord.home_team_id)
  );
  const initialAwayStats = toInitialStats(
    existingStats.filter((row) => row.team_id === matchRecord.away_team_id)
  );

  const isEditing = existingStats.length > 0 || matchRecord.status === "finished";

  // Fetch home team roster
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
    .eq("team_id", matchRecord.home_team_id)
    .eq("season_id", matchRecord.season_id)
    .eq("is_active", true);

  // Fetch away team roster
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
    .eq("team_id", matchRecord.away_team_id)
    .eq("season_id", matchRecord.season_id)
    .eq("is_active", true);

  const mergeRosters = (primary: any[], fallback: any[]) => {
    const map = new Map<string, any>();
    [...primary, ...fallback].forEach((row) => {
      if (!row?.player_id || map.has(row.player_id)) return;
      map.set(row.player_id, row);
    });
    return Array.from(map.values());
  };

  const fallbackHomeRoster = statPlayers
    .filter((row) => row.team_id === matchRecord.home_team_id)
    .map((row) => ({
      player_id: row.player_id,
      jersey_number: null,
      position: null,
      profiles: {
        id: row.profiles?.id || row.player_id,
        psn_id: row.profiles?.psn_id || row.player_id.slice(0, 8),
      },
    }));

  const fallbackAwayRoster = statPlayers
    .filter((row) => row.team_id === matchRecord.away_team_id)
    .map((row) => ({
      player_id: row.player_id,
      jersey_number: null,
      position: null,
      profiles: {
        id: row.profiles?.id || row.player_id,
        psn_id: row.profiles?.psn_id || row.player_id.slice(0, 8),
      },
    }));

  const finalHomeRoster = mergeRosters(homeRoster || [], fallbackHomeRoster);
  const finalAwayRoster = mergeRosters(awayRoster || [], fallbackAwayRoster);

  return (
    <div className="container mx-auto px-4 py-8">
      <MatchStatsInput
        match={match}
        homeRoster={finalHomeRoster}
        awayRoster={finalAwayRoster}
        initialHomeStats={initialHomeStats}
        initialAwayStats={initialAwayStats}
        initialHomeStreamUrl={matchRecord.home_stream_url || ""}
        initialAwayStreamUrl={matchRecord.away_stream_url || ""}
        isEditing={isEditing}
      />
    </div>
  );
}
