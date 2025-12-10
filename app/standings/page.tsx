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

type TeamRow = {
  id: string;
  name: string;
  logo_url: string | null;
  conference: "West" | "East" | null;
  penalty_points: number | null;
  points: number;
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

export default async function StandingsPage() {
  const supabase = await createClient();

  // 현재 시즌
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
            <CardTitle>순위표</CardTitle>
            <CardDescription>진행 중인 시즌이 없습니다.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // 팀 기본 정보 + 벌점
  const { data: teams } = await supabase
    .from("teams")
    .select(
      "id, name, logo_url, conference, penalty_points, points, is_withdrawn"
    )
    .eq("season_id", activeSeason.id)
    .order("name", { ascending: true });

  // 완료된 경기 (몰수 포함)
  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, match_date, status, home_team_id, away_team_id, home_score, away_score, is_forfeit, forfeit_winner_id"
    )
    .eq("season_id", activeSeason.id)
    .eq("status", "finished")
    .order("match_date", { ascending: false });

  const statsMap = new Map<string, TeamComputed>();
  const recentMap = new Map<string, string[]>();
  const headToHead: HeadToHeadMap = new Map();

  const sortedMatches: MatchRow[] = [...(matches || [])].sort(
    (a, b) =>
      new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
  );

  // 경기 단위 집계
  sortedMatches.forEach((match) => {
    const homeId = match.home_team_id;
    const awayId = match.away_team_id;
    const isForfeit =
      !!match.is_forfeit && !!match.forfeit_winner_id ? true : false;

    // 승/패 판정
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

    // 팀별 기본 구조 보장
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

    // 포인트 규칙: 승(2) / 패(1) / 몰수패(0)
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

    // 승/패 및 포인트
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
      margin: homeStats.margin, // placeholder, 계산은 후처리
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

    // Recent form (최근 5경기)
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

    // 승자승 기록
    if (winnerId && loserId) {
      addHeadToHeadWin(headToHead, winnerId, loserId);
    }
  });

  // 최종 Team 데이터 결합
  const withStats: TeamComputed[] =
    teams?.map((team) => {
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

      const safePenalty = team.penalty_points ? Number(team.penalty_points) : 0;

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
    }) || [];

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
  const allTeams = sortTeams([...westTeams, ...eastTeams]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">순위표</h1>
          <p className="text-xl text-muted-foreground">{activeSeason.name}</p>
        </div>

        {/* Tabs for Conference Selection */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="west">Western</TabsTrigger>
            <TabsTrigger value="east">Eastern</TabsTrigger>
          </TabsList>

          {/* All Teams */}
          <TabsContent value="all" className="space-y-4">
            <Card className="bg-neutral-900/5 dark:bg-white/5">
              <CardHeader>
                <CardTitle>전체 순위</CardTitle>
                <CardDescription>승점(벌점 반영) 기준 정렬</CardDescription>
              </CardHeader>
              <CardContent>
                <StandingsTable teams={allTeams} />
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
                <CardDescription>승점 → 승자승 → 평균득점</CardDescription>
              </CardHeader>
              <CardContent>
                <StandingsTable teams={westTeams} conference="West" />
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
                <CardDescription>승점 → 승자승 → 평균득점</CardDescription>
              </CardHeader>
              <CardContent>
                <StandingsTable teams={eastTeams} conference="East" />
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
                <span>승리 (W)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span>패배 (L)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 rounded bg-primary/10 border border-primary flex items-center justify-center text-xs font-bold">
                  1-8
                </div>
                <span>플레이오프 진출권</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
