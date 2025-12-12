/**
 * Legacy MariaDB -> Supabase migration helper.
 *
 * 1) SQL 덤프(supabase/migrations/kpl_2k26_1st_datas.sql)를 파싱해서
 *    현재 Supabase 스키마(teams / matches / match_stats / team_rosters 등)로 옮긴다.
 * 2) 기본 동작은 dry-run(파싱 + 통계 출력)이며, --apply 플래그를 주면 실제로 Supabase에 적재된다.
 *
 * 사용법:
 *   npx tsx scripts/migrate-legacy-season.ts --season "KPL 26 1st season" --apply
 *
 * 환경변수:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   LEGACY_SQL_FILE (optional, 기본값: supabase/migrations/kpl_2k26_1st_datas.sql)
 *   LEGACY_USER_PASSWORD (optional, 기본값: Legacy123!)
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const DEFAULT_SQL_FILE = process.env.LEGACY_SQL_FILE
  ? path.resolve(process.cwd(), process.env.LEGACY_SQL_FILE)
  : path.resolve(process.cwd(), "supabase", "migrations", "kpl_2k26_1st_datas.sql");

const DEFAULT_PASSWORD = process.env.LEGACY_USER_PASSWORD || "Legacy123!";

type LegacyRow = Record<string, string | number | null>;

interface LegacyTeam {
  idx: number;
  teamName: string;
  teamImage: string | null;
  league: string | null;
  nation: string | null;
  conference: string | null;
  penalty: number | null;
}

interface LegacyPlayer {
  psnId: string;
  teamName: string;
  position: string | null;
}

interface LegacySchedule {
  match_id: string;
  match_date: string;
  home: string;
  away: string;
  match_time: string;
  result_upload: string | null;
}

interface LegacyResult {
  match_id: string;
  home: string;
  away: string;
  homepts: number | null;
  awaypts: number | null;
  winner: string | null;
  loser: string | null;
  league: string | null;
  confiscation: number | null;
  uploadTime: string | null;
  round: number | null;
}

interface LegacyStat {
  match_id: string;
  psnId: string;
  vs: string | null;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fls: number;
  to: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
}

interface LegacyRankHistory {
  date: string;
  teamName: string;
  rank: number | null;
}

interface LegacyYoutube {
  match_id: string;
  home_name: string | null;
  home_url: string | null;
  away_name: string | null;
  away_url: string | null;
}

interface LegacyData {
  teams: LegacyTeam[];
  players: LegacyPlayer[];
  schedule: LegacySchedule[];
  results: LegacyResult[];
  stats: LegacyStat[];
  youtube: LegacyYoutube[];
  rankHistory: LegacyRankHistory[];
}

interface CliOptions {
  dryRun: boolean;
  seasonName: string;
  sqlFile: string;
}

const args = parseArgs(process.argv.slice(2));

async function main() {
  const sqlFile = args.sqlFile;
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ SQL 파일을 찾을 수 없습니다: ${sqlFile}`);
    process.exit(1);
  }

  console.log("📄 Legacy SQL 파일 로딩:", sqlFile);
  const rawSql = fs.readFileSync(sqlFile, "utf8");
  const legacy = extractLegacyData(rawSql);

  console.log("==== Legacy 데이터 개요 ====");
  console.log(`• Teams: ${legacy.teams.length}`);
  console.log(`• Players: ${legacy.players.length}`);
  console.log(`• Schedule Rows: ${legacy.schedule.length}`);
  console.log(`• Match Results: ${legacy.results.length}`);
  console.log(`• Stats Rows: ${legacy.stats.length}`);
  console.log(`• YouTube Links: ${legacy.youtube.length}`);
  console.log(`• Rank History Rows: ${legacy.rankHistory.length}`);
  console.log("===========================");

  if (args.dryRun) {
    console.log("\n🕵️  Dry run 모드이므로 Supabase에는 아무 것도 쓰지 않았습니다.");
    console.log("    --apply 플래그를 주고 다시 실행하면 실제로 적재됩니다.");
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 필요합니다.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log("\n🚀 Supabase 적재를 시작합니다...");

  const seasonId = await ensureSeason(supabase, args.seasonName, legacy.schedule);

  const teamMap = await syncTeams(supabase, seasonId, legacy.teams);
  const playerHelper = new PlayerHelper(supabase, teamMap, seasonId);

  await playerHelper.syncInitialPlayers(legacy.players);

  const matchMap = await syncMatches({
    supabase,
    seasonId,
    schedule: legacy.schedule,
    results: legacy.results,
    youtube: legacy.youtube,
    teamMap,
  });

  await syncMatchStats({
    supabase,
    stats: legacy.stats,
    matchMap,
    playerHelper,
    schedule: legacy.schedule,
    teamMap,
  });

  console.log("\n✅ Legacy 데이터 적재가 완료되었습니다!");
}

// -----------------------------
// CLI / 옵션 파싱
// -----------------------------

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    dryRun: true,
    seasonName: "KPL 26 1st season",
    sqlFile: DEFAULT_SQL_FILE,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--apply") {
      opts.dryRun = false;
    } else if (token === "--season" && argv[i + 1]) {
      opts.seasonName = argv[++i];
    } else if (token === "--sql" && argv[i + 1]) {
      opts.sqlFile = path.resolve(process.cwd(), argv[++i]);
    }
  }

  return opts;
}

// -----------------------------
// Legacy SQL 파서
// -----------------------------

function extractLegacyData(sql: string): LegacyData {
  return {
    teams: parseTable(sql, "current_teamList").map((row) => ({
      idx: numberOrNull(row.idx) ?? 0,
      teamName: stringOrNull(row.teamName) ?? "Unknown Team",
      teamImage: emptyToNull(row.teamImage),
      league: stringOrNull(row.league),
      nation: stringOrNull(row.nation),
      conference: stringOrNull(row.conference),
      penalty: numberOrNull(row.penalty),
    })),
    players: parseTable(sql, "current_leager").map((row) => ({
      psnId: stringOrNull(row.psnId) ?? "",
      teamName: stringOrNull(row.teamName) ?? "",
      position: stringOrNull(row.position),
    })),
    schedule: parseTable(sql, "current_schedule").map((row) => ({
      match_id: stringOrNull(row.match_id) ?? "",
      match_date: stringOrNull(row.match_date) ?? "",
      home: stringOrNull(row.home) ?? "",
      away: stringOrNull(row.away) ?? "",
      match_time: stringOrNull(row.match_time) ?? "",
      result_upload: stringOrNull(row.result_upload),
    })),
    results: parseTable(sql, "current_match").map((row) => ({
      match_id: stringOrNull(row.match_id) ?? "",
      home: stringOrNull(row.home) ?? "",
      away: stringOrNull(row.away) ?? "",
      homepts: numberOrNull(row.homepts),
      awaypts: numberOrNull(row.awaypts),
      winner: stringOrNull(row.winner),
      loser: stringOrNull(row.loser),
      league: stringOrNull(row.league),
      confiscation: numberOrNull(row.confiscation),
      uploadTime: stringOrNull(row.uploadTime),
      round: numberOrNull(row.round),
    })),
    stats: parseTable(sql, "current_stats").map((row) => ({
      match_id: stringOrNull(row.match_id) ?? "",
      psnId: stringOrNull(row.psnId) ?? "",
      vs: stringOrNull(row.vs),
      pts: numberOrZero(row.pts),
      reb: numberOrZero(row.reb),
      ast: numberOrZero(row.ast),
      stl: numberOrZero(row.stl),
      blk: numberOrZero(row.blk),
      fls: numberOrZero(row.fls),
      to: numberOrZero(row.to),
      fgm: numberOrZero(row.fgm),
      fga: numberOrZero(row.fga),
      three_pm: numberOrZero(row["3pm"]),
      three_pa: numberOrZero(row["3pa"]),
    })),
    youtube: parseTable(sql, "current_youtube").map((row) => ({
      match_id: stringOrNull(row.match_id) ?? "",
      home_name: stringOrNull(row.home_name),
      home_url: stringOrNull(row.home_url),
      away_name: stringOrNull(row.away_name),
      away_url: stringOrNull(row.away_url),
    })),
    rankHistory: parseTable(sql, "current_rank_history").map((row) => ({
      date: stringOrNull(row.date) ?? "",
      teamName: stringOrNull(row.teamName) ?? "",
      rank: numberOrNull(row.rank),
    })),
  };
}

function parseTable(sql: string, table: string): LegacyRow[] {
  const rows: LegacyRow[] = [];
  const regex = new RegExp(
    `INSERT INTO \\`${table}\\` \\(([^)]+)\\) VALUES\\s*([\\s\\S]+?)\\;`,
    "gi"
  );

  let match: RegExpExecArray | null;
  while ((match = regex.exec(sql))) {
    const rawColumns = match[1]
      .split(",")
      .map((col) => col.replace(/`/g, "").trim())
      .filter(Boolean);

    const tuples = splitTuples(match[2]);

    for (const tuple of tuples) {
      if (tuple.length === 0) continue;
      const row: LegacyRow = {};
      rawColumns.forEach((column, idx) => {
        row[column] = convertLiteral(tuple[idx]);
      });
      rows.push(row);
    }
  }

  return rows;
}

function splitTuples(valueBlock: string): string[][] {
  const tuples: string[][] = [];
  let current: string[] = [];
  let buffer = "";
  let inString = false;

  const pushValue = () => {
    current.push(buffer.trim());
    buffer = "";
  };

  for (let i = 0; i < valueBlock.length; i++) {
    const char = valueBlock[i];
    const next = valueBlock[i + 1];

    if (char === "'" && next === "'") {
      buffer += "'";
      i++;
      continue;
    }

    if (char === "'") {
      inString = !inString;
      continue;
    }

    if (!inString && char === "(") {
      current = [];
      buffer = "";
      continue;
    }

    if (!inString && char === ",") {
      pushValue();
      continue;
    }

    if (!inString && char === ")") {
      pushValue();
      tuples.push(current);
      current = [];

      // 스kip 공백/콤마
      while (valueBlock[i + 1] === "," || /\s/.test(valueBlock[i + 1] ?? "")) {
        i++;
      }
      continue;
    }

    buffer += char;
  }

  return tuples;
}

function convertLiteral(value: string | undefined): string | number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (upper === "NULL") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

const numberOrNull = (value: string | number | null | undefined) =>
  typeof value === "number" ? value : value == null ? null : Number(value);

const numberOrZero = (value: string | number | null | undefined) => {
  const num = numberOrNull(value);
  return typeof num === "number" && !isNaN(num) ? num : 0;
};

const stringOrNull = (value: string | number | null | undefined) => {
  if (value == null) return null;
  return String(value).trim();
};

const emptyToNull = (value: string | number | null | undefined) => {
  const str = stringOrNull(value);
  return str ? str : null;
};

// -----------------------------
// Season / Team / Player 동기화
// -----------------------------

async function ensureSeason(
  supabase: SupabaseClient,
  seasonName: string,
  schedule: LegacySchedule[]
): Promise<string> {
  const { data: existing, error: seasonError } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("name", seasonName)
    .maybeSingle();

  if (seasonError) {
    throw new Error(`시즌 조회 실패: ${seasonError.message}`);
  }

  if (existing) {
    console.log(`🗂️  기존 시즌 사용: ${existing.name} (${existing.id})`);
    return existing.id;
  }

  const dates = schedule
    .map((row) => row.match_date)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const startDate = dates[0] ?? new Date().toISOString().split("T")[0];
  const endDate = dates[dates.length - 1] ?? startDate;

  const { data, error } = await supabase
    .from("seasons")
    .insert({
      name: seasonName,
      start_date: startDate,
      end_date: endDate,
      is_active: false,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`시즌 생성 실패: ${error.message}`);
  }

  console.log(`🆕 새 시즌 생성: ${seasonName} (${data.id})`);
  return data.id;
}

async function syncTeams(
  supabase: SupabaseClient,
  seasonId: string,
  teams: LegacyTeam[]
): Promise<Map<string, string>> {
  const normalized = new Map<string, string>();

  const { data: existing, error } = await supabase
    .from("teams")
    .select("id, name")
    .eq("season_id", seasonId);

  if (error) {
    throw new Error(`팀 조회 실패: ${error.message}`);
  }

  existing?.forEach((team) => {
    normalized.set(normalizeTeamName(team.name), team.id);
  });

  for (const team of teams) {
    const key = normalizeTeamName(team.teamName);
    if (!team.teamName) continue;

    if (normalized.has(key)) continue;

    const insertPayload: Record<string, any> = {
      season_id: seasonId,
      name: team.teamName.trim(),
      logo_url: team.teamImage,
      conference: normalizeConference(team.conference),
      region: team.nation ?? null,
      wins: 0,
      losses: 0,
      points_for: 0,
      points_against: 0,
      is_active: true,
      penalty_points: team.penalty ?? 0,
    };

    const { data, error: insertError } = await supabase
      .from("teams")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      console.error(`⚠️  팀 생성 실패 (${team.teamName}): ${insertError.message}`);
      continue;
    }

    normalized.set(key, data.id);
    console.log(`   • 팀 등록: ${team.teamName}`);
  }

  return normalized;
}

function normalizeTeamName(name: string | null | undefined) {
  return (name ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeConference(raw: string | null | undefined) {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if (lower.includes("west")) return "West";
  if (lower.includes("east")) return "East";
  return null;
}

// -----------------------------
// Player Helper
// -----------------------------

class PlayerHelper {
  private supabase: SupabaseClient;
  private teamMap: Map<string, string>;
  private seasonId: string;
  private profileCache = new Map<string, string>(); // psn -> profileId
  private rosterCache = new Set<string>(); // `${teamId}:${profileId}`

  constructor(supabase: SupabaseClient, teamMap: Map<string, string>, seasonId: string) {
    this.supabase = supabase;
    this.teamMap = teamMap;
    this.seasonId = seasonId;
  }

  async syncInitialPlayers(players: LegacyPlayer[]) {
    for (const player of players) {
      if (!player.psnId) continue;
      const psnKey = normalizePsn(player.psnId);
      if (this.profileCache.has(psnKey)) continue;

      const teamId = this.teamMap.get(normalizeTeamName(player.teamName));
      const profileId = await this.ensureProfile(player.psnId);
      if (teamId) {
        await this.ensureRoster(profileId, teamId, player.position);
      } else {
        console.warn(`⚠️  팀을 찾을 수 없습니다: ${player.teamName} (${player.psnId})`);
      }
    }
  }

  async ensureProfile(psnId: string): Promise<string> {
    const key = normalizePsn(psnId);
    if (this.profileCache.has(key)) {
      return this.profileCache.get(key)!;
    }

    const { data: existing, error } = await this.supabase
      .from("profiles")
      .select("id, psn_id")
      .eq("psn_id", psnId.trim())
      .maybeSingle();

    if (error) {
      throw new Error(`프로필 조회 실패 (${psnId}): ${error.message}`);
    }

    if (existing) {
      this.profileCache.set(key, existing.id);
      return existing.id;
    }

    const profileId = await this.createAuthUser(psnId);
    this.profileCache.set(key, profileId);
    return profileId;
  }

  async ensureRoster(profileId: string, teamId: string, position?: string | null) {
    const rosterKey = `${teamId}:${profileId}`;
    if (this.rosterCache.has(rosterKey)) {
      return;
    }

    const payload: Record<string, any> = {
      season_id: this.seasonId,
      team_id: teamId,
      player_id: profileId,
      position: position ?? null,
      is_active: true,
    };

    const { error } = await this.supabase.from("team_rosters").insert(payload);
    if (error) {
      if (error.message.includes("duplicate")) {
        this.rosterCache.add(rosterKey);
        return;
      }
      console.error(`⚠️  로스터 삽입 실패: ${error.message}`);
      return;
    }

    this.rosterCache.add(rosterKey);
  }

  private async createAuthUser(psnId: string): Promise<string> {
    const normalized = sanitizeForEmail(psnId);
    let attempt = 0;

    while (attempt < 5) {
      const email =
        attempt === 0
          ? `${normalized}@legacy.kpl`
          : `${normalized}+${attempt}@legacy.kpl`;

      const { data, error } = await this.supabase.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: { psn_id: psnId.trim(), legacy_account: true },
      });

      if (error) {
        if (error.message?.includes("already")) {
          attempt++;
          continue;
        }
        throw new Error(`Auth user 생성 실패 (${psnId}): ${error.message}`);
      }

      if (!data?.user) {
        throw new Error(`Auth user 생성 실패 (${psnId}) - user 미존재`);
      }

      console.log(`   • 프로필 생성: ${psnId} (${email})`);
      return data.user.id;
    }

    throw new Error(`Auth user 이메일 중복으로 생성 실패 (${psnId})`);
  }
}

function normalizePsn(psnId: string) {
  return psnId.trim().toLowerCase();
}

function sanitizeForEmail(psnId: string) {
  return psnId
    .trim()
    .replace(/\s+/g, "_")
    .replace(/\|/g, "l")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

// -----------------------------
// Match / Youtube / Stats sync
// -----------------------------

interface MatchSyncParams {
  supabase: SupabaseClient;
  seasonId: string;
  schedule: LegacySchedule[];
  results: LegacyResult[];
  youtube: LegacyYoutube[];
  teamMap: Map<string, string>;
}

interface MatchMapValue {
  id: string;
  matchSequence: string;
  homeTeamId: string;
  awayTeamId: string;
}

async function syncMatches(params: MatchSyncParams): Promise<Map<string, MatchMapValue>> {
  const { supabase, seasonId, schedule, results, youtube, teamMap } = params;
  const matchMap = new Map<string, MatchMapValue>();

  const resultMap = new Map<string, LegacyResult>();
  results.forEach((row) => {
    if (row.match_id) resultMap.set(row.match_id, row);
  });

  const youtubeMap = new Map<string, LegacyYoutube>();
  youtube.forEach((row) => {
    if (row.match_id) youtubeMap.set(row.match_id, row);
  });

  const matchPayloads: Record<string, any>[] = [];

  for (const entry of schedule) {
    if (!entry.match_id) continue;

    const homeId = teamMap.get(normalizeTeamName(entry.home));
    const awayId = teamMap.get(normalizeTeamName(entry.away));

    if (!homeId || !awayId) {
      console.warn(`⚠️  매치에 필요한 팀을 찾지 못했습니다: ${entry.match_id}`);
      continue;
    }

    const result = resultMap.get(entry.match_id);
    const youtubeLink = youtubeMap.get(entry.match_id);

    const matchId = crypto.randomUUID();
    const isoDate = buildKstIso(entry.match_date, entry.match_time);
    const status =
      result && result.homepts != null && result.awaypts != null
        ? "finished"
        : "scheduled";

    matchPayloads.push({
      id: matchId,
      season_id: seasonId,
      home_team_id: homeId,
      away_team_id: awayId,
      match_date: isoDate,
      status,
      home_score: numberOrNull(result?.homepts),
      away_score: numberOrNull(result?.awaypts),
      match_sequence: entry.match_id,
      result_uploaded: entry.result_upload?.toUpperCase() === "Y",
      home_stream_url: youtubeLink?.home_url ?? null,
      away_stream_url: youtubeLink?.away_url ?? null,
    });

    matchMap.set(entry.match_id, {
      id: matchId,
      matchSequence: entry.match_id,
      homeTeamId: homeId,
      awayTeamId: awayId,
    });
  }

  await batchInsert(supabase, "matches", matchPayloads, 100);
  console.log(`⚙️  ${matchPayloads.length}개 경기를 matches 테이블에 삽입했습니다.`);

  return matchMap;
}

function buildKstIso(date: string, time: string) {
  const normalizedTime = time && time.includes(":") ? time : `${time}:00`;
  return `${date}T${normalizedTime ?? "00:00"}:00+09:00`;
}

interface StatsSyncParams {
  supabase: SupabaseClient;
  stats: LegacyStat[];
  matchMap: Map<string, MatchMapValue>;
  playerHelper: PlayerHelper;
  schedule: LegacySchedule[];
  teamMap: Map<string, string>;
}

async function syncMatchStats(params: StatsSyncParams) {
  const { supabase, stats, matchMap, playerHelper, schedule, teamMap } = params;

  const matchLookup = new Map<
    string,
    { home: string; away: string; homeKey: string; awayKey: string }
  >();

  schedule.forEach((row) => {
    if (!row.match_id) return;
    matchLookup.set(row.match_id, {
      home: row.home,
      away: row.away,
      homeKey: normalizeTeamName(row.home),
      awayKey: normalizeTeamName(row.away),
    });
  });

  const statPayloads: Record<string, any>[] = [];

  for (const stat of stats) {
    if (!stat.match_id || !stat.psnId) continue;

    const matchInfo = matchMap.get(stat.match_id);
    if (!matchInfo) {
      console.warn(`⚠️  match_stats: match_id를 찾을 수 없음 (${stat.match_id})`);
      continue;
    }

    const scheduleInfo = matchLookup.get(stat.match_id);
    let teamId: string | undefined;

    if (scheduleInfo && stat.vs) {
      const vsKey = normalizeTeamName(stat.vs);
      if (vsKey === scheduleInfo.homeKey) {
        teamId = teamMap.get(scheduleInfo.awayKey);
      } else if (vsKey === scheduleInfo.awayKey) {
        teamId = teamMap.get(scheduleInfo.homeKey);
      }
    }

    if (!teamId) {
      // fallback: 플레이어 기본 팀
      const fallbackTeam = stat.vs
        ? null
        : scheduleInfo
        ? teamMap.get(scheduleInfo.homeKey) || teamMap.get(scheduleInfo.awayKey)
        : null;
      teamId = fallbackTeam ?? null ?? undefined;
    }

    if (!teamId) {
      console.warn(`⚠️  선수 팀을 알 수 없음: ${stat.psnId} (${stat.match_id})`);
      continue;
    }

    const profileId = await playerHelper.ensureProfile(stat.psnId);
    await playerHelper.ensureRoster(profileId, teamId, null);

    statPayloads.push({
      match_id: matchInfo.id,
      team_id: teamId,
      player_id: profileId,
      grade: null,
      pts: stat.pts,
      reb: stat.reb,
      ast: stat.ast,
      stl: stat.stl,
      blk: stat.blk,
      fls: stat.fls,
      turnovers: stat.to,
      fgm: stat.fgm,
      fga: stat.fga,
      three_pm: stat.three_pm,
      three_pa: stat.three_pa,
      ftm: 0,
      fta: 0,
    });
  }

  await batchInsert(supabase, "match_stats", statPayloads, 500);
  console.log(`🎯 match_stats ${statPayloads.length}건 삽입 완료`);
}

async function batchInsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, any>[],
  chunkSize: number
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (chunk.length === 0) continue;
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      throw new Error(`${table} insert 실패: ${error.message}`);
    }
  }
}

// -----------------------------
// Entry
// -----------------------------

main().catch((err) => {
  console.error("❌ 마이그레이션 중 오류 발생:", err);
  process.exit(1);
});
