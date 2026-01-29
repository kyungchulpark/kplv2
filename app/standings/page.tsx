import { createClient } from "@/utils/supabase/server";
import { StandingsTable } from "@/components/standings/standings-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeasonSelector } from "@/components/stats/season-selector";
import { createServiceClient } from "@/utils/supabase/service";

interface StandingsPageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  conference: "West" | "East" | null;
  penalty_points: number | null;
  points: number;
  is_active?: boolean | null;
  is_withdrawn?: boolean | null;
};

type MatchRow = {
  id: string;
  match_date: string;
  status: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  is_forfeit: boolean | null;
  forfeit_winner_id: string | null;
};

type TeamComputed = TeamRow & {
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  points_for: number;
  points_against: number;
  ppg: number;
  papg: number;
  margin: number;
  pointsNet: number;
  recentForm: string[];
};

type HeadToHeadMap = Map<string, Map<string, number>>;

const DEFAULT_ZERO: TeamComputed = {
  id: "",
  name: "",
  logo_url: null,
  conference: null,
  penalty_points: 0,
  points: 0,
  is_withdrawn: false,
  wins: 0,
  losses: 0,
  gamesPlayed: 0,
  winRate: 0,
  points_for: 0,
  points_against: 0,
  ppg: 0,
  papg: 0,
  margin: 0,
  pointsNet: 0,
  recentForm: [],
};

function addHeadToHeadWin(
  map: HeadToHeadMap,
  winnerId: string,
  loserId: string
) {
  if (!map.has(winnerId)) map.set(winnerId, new Map());
  const inner = map.get(winnerId)!;
  inner.set(loserId, (inner.get(loserId) || 0) + 1);
}

function normalizeMatchDateKey(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const { seasonId } = await searchParams;
  const cookieClient = await createClient();
  const serviceClient = createServiceClient();
  const supabase = serviceClient ?? cookieClient;

  const pagedSelect = async (
    table: string,
    select: string,
    applyFilters?: (query: any) => any
  ) => {
    const rows: any[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      let query = supabase.from(table).select(select).range(from, to);
      if (applyFilters) {
        query = applyFilters(query);
      }
      const { data, error } = await query;
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  };

  // Get seasons for selector and resolve the selected season
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, is_active, start_date")
    .order("start_date", { ascending: false });

  if (!seasons || seasons.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
            <CardDescription>No seasons available.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const activeSeason = seasons.find((season) => season.is_active) || seasons[0];
  const selectedSeason =
    seasons.find((season) => season.id === seasonId) || activeSeason;

  // Get team info + penalty points for the selected season
  let teams = await pagedSelect(
    "teams",
    "id, name, logo_url, conference, penalty_points, points, is_active, is_withdrawn",
    (query) =>
      query.eq("season_id", selectedSeason.id).order("name", {
        ascending: true,
      })
  );

  // Get finished matches (including forfeits) for the selected season
  const matches = await pagedSelect(
    "matches",
    "id, match_date, status, home_team_id, away_team_id, home_score, away_score, is_forfeit, forfeit_winner_id",
    (query) =>
      query
        .eq("season_id", selectedSeason.id)
        .eq("status", "finished")
        .order("match_date", { ascending: false })
  );

  // Fallback: if teams are blocked by RLS but matches are visible, load teams by IDs
  if (teams.length === 0 && matches.length > 0) {
    const teamIds = Array.from(
      new Set(matches.flatMap((m: MatchRow) => [m.home_team_id, m.away_team_id]))
    );
    teams = await pagedSelect(
      "teams",
      "id, name, logo_url, conference, penalty_points, points, is_active, is_withdrawn",
      (query) => query.in("id", teamIds).order("name", { ascending: true })
    );
  }

  const teamMatchCount = new Map<string, number>();
  (matches as MatchRow[]).forEach((match) => {
    teamMatchCount.set(
      match.home_team_id,
      (teamMatchCount.get(match.home_team_id) || 0) + 1
    );
    teamMatchCount.set(
      match.away_team_id,
      (teamMatchCount.get(match.away_team_id) || 0) + 1
    );
  });

  // Merge case-only duplicate team names for standings stability
  const canonicalByKey = new Map<string, TeamRow>();
  const canonicalCountByKey = new Map<string, number>();
  teams.forEach((team: TeamRow) => {
    const key = team.name.trim().toLowerCase();
    const count = teamMatchCount.get(team.id) || 0;
    const current = canonicalByKey.get(key);
    const currentCount = canonicalCountByKey.get(key) || -1;
    if (!current || count > currentCount) {
      canonicalByKey.set(key, team);
      canonicalCountByKey.set(key, count);
    }
  });

  const canonicalIdByTeamId = new Map<string, string>();
  const penaltyByCanonicalId = new Map<string, number>();
  teams.forEach((team: TeamRow) => {
    const key = team.name.trim().toLowerCase();
    const canonicalTeam = canonicalByKey.get(key) || team;
    canonicalIdByTeamId.set(team.id, canonicalTeam.id);
    const canonicalId = canonicalTeam.id;
    const penalty = Number(team.penalty_points || 0);
    penaltyByCanonicalId.set(
      canonicalId,
      (penaltyByCanonicalId.get(canonicalId) || 0) + penalty
    );
  });

  const dedupedTeams: TeamRow[] = Array.from(canonicalByKey.values());
  const canonicalMatchCount = new Map<string, number>();
  teamMatchCount.forEach((count, teamId) => {
    const canonicalId = canonicalIdByTeamId.get(teamId) || teamId;
    canonicalMatchCount.set(
      canonicalId,
      (canonicalMatchCount.get(canonicalId) || 0) + count
    );
  });

  const participatingTeams = dedupedTeams.filter((team) => {
    const hasGames = (canonicalMatchCount.get(team.id) || 0) > 0;
    const isActive = team.is_active ?? true;
    return hasGames || isActive;
  });

  const statsMap = new Map<string, TeamComputed>();
  const recentMap = new Map<string, string[]>();
  const headToHead: HeadToHeadMap = new Map();

  const normalizedMatches: MatchRow[] = (matches as MatchRow[])
    .map((match) => ({
      ...match,
      home_team_id: canonicalIdByTeamId.get(match.home_team_id) || match.home_team_id,
      away_team_id: canonicalIdByTeamId.get(match.away_team_id) || match.away_team_id,
      forfeit_winner_id: match.forfeit_winner_id
        ? canonicalIdByTeamId.get(match.forfeit_winner_id) || match.forfeit_winner_id
        : null,
    }))
    .filter((match) => match.home_team_id !== match.away_team_id);

  const dedupedMatchMap = new Map<string, MatchRow>();
  normalizedMatches.forEach((match) => {
    const matchDateKey = normalizeMatchDateKey(match.match_date);
    const key = `${match.home_team_id}::${match.away_team_id}::${matchDateKey}`;
    if (dedupedMatchMap.has(key)) return;
    dedupedMatchMap.set(key, { ...match, match_date: matchDateKey });
  });

  const dedupedMatches: MatchRow[] = Array.from(dedupedMatchMap.values());

  const sortedMatches: MatchRow[] = [...dedupedMatches].sort(
    (a, b) =>
      new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  if (process.env.NODE_ENV !== "production") {
    console.log("[Standings] season", {
      id: selectedSeason.id,
      name: selectedSeason.name,
      usingServiceRole: !!serviceClient,
      teams: teams.length,
      matches: (matches as MatchRow[]).length,
      dedupedTeams: dedupedTeams.length,
      normalizedMatches: normalizedMatches.length,
      dedupedMatches: dedupedMatches.length,
      duplicateMatchesRemoved: normalizedMatches.length - dedupedMatches.length,
    });
  }

  // Aggregate match data
  sortedMatches.forEach((match) => {
    const homeId = match.home_team_id;
    const awayId = match.away_team_id;
    const isForfeit =
      !!match.is_forfeit && !!match.forfeit_winner_id ? true : false;

    // Determine winner/loser
    let winnerId: string | null = null;
    let loserId: string | null = null;

    if (isForfeit && match.forfeit_winner_id) {
      winnerId = match.forfeit_winner_id;
      loserId = match.forfeit_winner_id === homeId ? awayId : homeId;
    } else if (match.home_score !== null && match.away_score !== null) {
      if (match.home_score > match.away_score) {
        winnerId = homeId;
        loserId = awayId;
      } else if (match.away_score > match.home_score) {
        winnerId = awayId;
        loserId = homeId;
      }
    }

    // Ensure team data structure exists
    const ensureTeam = (teamId: string) => {
      if (!statsMap.has(teamId)) {
        statsMap.set(teamId, { ...DEFAULT_ZERO, id: teamId });
      }
      return statsMap.get(teamId)!;
    };

    const homeStats = ensureTeam(homeId);
    const awayStats = ensureTeam(awayId);

    const homeWon = winnerId === homeId;
    const awayWon = winnerId === awayId;
    const homeLost = loserId === homeId;
    const awayLost = loserId === awayId;

    // Points rule: Win(2) / Loss(1) / Forfeit Loss(0)
    const homePointsDelta = isForfeit
      ? homeWon
        ? 2
        : 0
      : homeWon
      ? 2
      : 1;
    const awayPointsDelta = isForfeit
      ? awayWon
        ? 2
        : 0
      : awayWon
      ? 2
      : 1;

    // Update wins/losses and points
    statsMap.set(homeId, {
      ...homeStats,
      wins: homeStats.wins + (homeWon ? 1 : 0),
      losses: homeStats.losses + (homeLost ? 1 : 0),
      points: (homeStats.points || 0) + homePointsDelta,
      points_for:
        homeStats.points_for +
        (isForfeit ? 0 : match.home_score ? match.home_score : 0),
      points_against:
        homeStats.points_against +
        (isForfeit ? 0 : match.away_score ? match.away_score : 0),
      margin: homeStats.margin, // placeholder, calculated later
    });

    statsMap.set(awayId, {
      ...awayStats,
      wins: awayStats.wins + (awayWon ? 1 : 0),
      losses: awayStats.losses + (awayLost ? 1 : 0),
      points: (awayStats.points || 0) + awayPointsDelta,
      points_for:
        awayStats.points_for +
        (isForfeit ? 0 : match.away_score ? match.away_score : 0),
      points_against:
        awayStats.points_against +
        (isForfeit ? 0 : match.home_score ? match.home_score : 0),
      margin: awayStats.margin,
    });

    // Recent form (last 5 games)
    if (winnerId) {
      if (!recentMap.has(winnerId)) recentMap.set(winnerId, []);
      if (recentMap.get(winnerId)!.length < 5) {
        recentMap.get(winnerId)!.push("W");
      }
    }
    if (loserId) {
      if (!recentMap.has(loserId)) recentMap.set(loserId, []);
      if (recentMap.get(loserId)!.length < 5) {
        recentMap.get(loserId)!.push("L");
      }
    }

    // Record head-to-head
    if (winnerId && loserId) {
      addHeadToHeadWin(headToHead, winnerId, loserId);
    }
  });

  // Combine final team data
  const withStats: TeamComputed[] =
    participatingTeams.map((team) => {
      const raw = statsMap.get(team.id) || { ...DEFAULT_ZERO, id: team.id };
      const gamesPlayed = raw.wins + raw.losses;

      const nonForfeitGames = sortedMatches.filter(
        (m) =>
          m.status === "finished" &&
          !m.is_forfeit &&
          (m.home_team_id === team.id || m.away_team_id === team.id)
      ).length;

      const ppg =
        nonForfeitGames > 0
          ? raw.points_for / nonForfeitGames
          : gamesPlayed > 0
          ? raw.points_for / gamesPlayed
          : 0;
      const papg =
        nonForfeitGames > 0
          ? raw.points_against / nonForfeitGames
          : gamesPlayed > 0
          ? raw.points_against / gamesPlayed
          : 0;
      const margin =
        nonForfeitGames > 0
          ? (raw.points_for - raw.points_against) / nonForfeitGames
          : gamesPlayed > 0
          ? (raw.points_for - raw.points_against) / gamesPlayed
          : 0;

      const safePenalty = penaltyByCanonicalId.get(team.id) || 0;

      return {
        ...team,
        wins: raw.wins,
        losses: raw.losses,
        gamesPlayed,
        winRate: gamesPlayed > 0 ? (raw.wins / gamesPlayed) * 100 : 0,
        points: raw.points,
        points_for: raw.points_for,
        points_against: raw.points_against,
        ppg,
        papg,
        margin,
        pointsNet: raw.points - safePenalty,
        recentForm: recentMap.get(team.id) || [],
      };
    });

  const headToHeadCompare = (a: TeamComputed, b: TeamComputed) => {
    const aWins = headToHead.get(a.id)?.get(b.id) || 0;
    const bWins = headToHead.get(b.id)?.get(a.id) || 0;
    if (aWins === bWins) return 0;
    return aWins > bWins ? -1 : 1;
  };

  const sortTeams = (list: TeamComputed[]) =>
    [...list].sort((a, b) => {
      if (b.pointsNet !== a.pointsNet) return b.pointsNet - a.pointsNet;
      const h2h = headToHeadCompare(a, b);
      if (h2h !== 0) return h2h;
      if (b.ppg !== a.ppg) return b.ppg - a.ppg;
      return b.points_for - a.points_for;
    });

  const westTeams = sortTeams(
    withStats.filter((t) => t.conference === "West")
  );
  const eastTeams = sortTeams(
    withStats.filter((t) => t.conference === "East")
  );
  const allTeams = sortTeams(withStats);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Standings</h1>
            <p className="text-xl text-muted-foreground">
              {selectedSeason.name}
            </p>
          </div>
          <SeasonSelector seasons={seasons} selectedSeasonId={selectedSeason.id} />
        </div>

        {/* Tabs for Conference Selection */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="west">Western</TabsTrigger>
            <TabsTrigger value="east">Eastern</TabsTrigger>
          </TabsList>

          {/* All Teams */}
          <TabsContent value="all" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Overall Standings</CardTitle>
                <CardDescription>
                  Top 8 from each conference advance to playoffs
                  <span className="ml-2 text-red-500">West</span> |
                  <span className="ml-1 text-blue-500">East</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StandingsTable teams={allTeams} showConferenceHighlight={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Western Conference */}
          <TabsContent value="west" className="space-y-4">
            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="h-1 w-12 bg-red-500 rounded-full"></div>
                  <span className="text-2xl">Western Conference</span>
                </CardTitle>
                <CardDescription>Points → Head-to-head → PPG</CardDescription>
              </CardHeader>
              <CardContent>
                <StandingsTable teams={westTeams} conference="West" showConferenceHighlight={true} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Eastern Conference */}
          <TabsContent value="east" className="space-y-4">
            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="h-1 w-12 bg-blue-500 rounded-full"></div>
                  <span className="text-2xl">Eastern Conference</span>
                </CardTitle>
                <CardDescription>Points → Head-to-head → PPG</CardDescription>
              </CardHeader>
              <CardContent>
                <StandingsTable teams={eastTeams} conference="East" showConferenceHighlight={true} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <Card className="border-muted">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span>Win (W)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span>Loss (L)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded bg-primary/10 border border-primary flex items-center justify-center text-xs font-bold">
                  1-8
                </div>
                <span>Playoff Qualification</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
