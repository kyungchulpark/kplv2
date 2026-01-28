import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type SeasonDef = {
  name: string;
  code: string;
  start: string;
  end: string;
  year: number;
};

// Season configuration
const SEASONS: SeasonDef[] = [
  { name: "2020 Season 1st", code: "2020_1st", start: "2020-10-01", end: "2020-12-31", year: 2020 },
  { name: "2021 Season 2nd", code: "2021_2nd", start: "2021-04-01", end: "2021-06-30", year: 2021 },
  { name: "2021 Season 3rd", code: "2021_3rd", start: "2021-07-01", end: "2021-09-30", year: 2021 },
  { name: "2021 Season 4th", code: "2021_4th", start: "2021-10-01", end: "2021-12-31", year: 2021 },
  { name: "2022 Season 1st", code: "2022_1st", start: "2022-01-01", end: "2022-03-31", year: 2022 },
  { name: "2022 Season 2nd", code: "2022_2nd", start: "2022-04-01", end: "2022-06-30", year: 2022 },
  { name: "2022 Season 3rd", code: "2022_3rd", start: "2022-07-01", end: "2022-09-30", year: 2022 },
  { name: "2023 Season 1st", code: "2023_1st", start: "2023-01-01", end: "2023-03-31", year: 2023 },
  { name: "2023 Season 2nd", code: "2023_2nd", start: "2023-04-01", end: "2023-06-30", year: 2023 },
  { name: "2023 Season 3rd", code: "2023_3rd", start: "2023-07-01", end: "2023-09-30", year: 2023 },
  { name: "2024 Season 1st", code: "2024_1st", start: "2024-01-01", end: "2024-03-31", year: 2024 },
  { name: "2024 Season 2nd", code: "2024_2nd", start: "2024-04-01", end: "2024-06-30", year: 2024 },
  { name: "2024 Season 3rd", code: "2024_3rd", start: "2024-07-01", end: "2024-09-30", year: 2024 },
  { name: "2024 Season 4th", code: "2024_4th", start: "2024-10-01", end: "2024-12-31", year: 2024 },
  { name: "2025 Season 1st", code: "2025_1st", start: "2025-01-01", end: "2025-03-31", year: 2025 },
  { name: "2025 Season 2nd", code: "2025_2nd", start: "2025-04-01", end: "2025-06-30", year: 2025 },
  { name: "2025 Season 3rd", code: "2025_3nd", start: "2025-07-01", end: "2025-09-30", year: 2025 },
  { name: "2026 Season 1st", code: "current", start: "2025-10-26", end: "2026-03-31", year: 2026 },
];

type SeasonDb = {
  id: string;
  name: string;
};

type SeasonRuntime = SeasonDef & {
  id: string;
};

type TeamDb = {
  id: string;
  name: string;
  season_id: string;
};

type MatchDb = {
  id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
};

type OldProfileDb = {
  id: string;
  psn_id: string;
  psn_id_normalized: string;
};

type OldRosterDb = {
  old_profile_id: string;
  team_id: string;
};

function toIsoOrNull(value: string | undefined | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Parse MySQL-style datetime strings as UTC to avoid local-time shifts
 * that would create duplicate match rows across runs.
 */
function parseDateTimeUtc(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (match) {
    const [, y, m, d, hh = "00", mm = "00", ss = "00"] = match;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const hour = Number(hh);
    const minute = Number(mm);
    const second = Number(ss);
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second)).toISOString();
  }
  return toIsoOrNull(trimmed);
}

function normalizeMatchDateKey(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/**
 * Legacy match tables mix real datetimes ("2021-02-22 21:30:00")
 * and synthetic IDs like "20210426_20".
 * Convert both into a valid timestamptz so inserts succeed.
 */
function parseLegacyMatchDate(row: string[], season: SeasonRuntime) {
  const raw = row[0]?.trim();
  const uploadTime = row[9]?.trim();

  // Case 1: already a datetime string.
  const directIso = parseDateTimeUtc(raw);
  if (directIso) return directIso;

  // Case 2: match_id like YYYYMMDD_seq.
  const matchId = raw?.match(/^(\d{4})(\d{2})(\d{2})_(\d{1,4})$/);
  if (matchId) {
    const [, y, m, d, seq] = matchId;
    const year = Number(y);
    const month = Number(m);
    const day = Number(d);
    const seqNum = Number(seq);
    // Use sequence as seconds offset to keep ordering deterministic.
    const baseUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
    return new Date(baseUtc + seqNum * 1000).toISOString();
  }

  // Case 3: fall back to uploadTime if present.
  const uploadIso = parseDateTimeUtc(uploadTime);
  if (uploadIso) return uploadIso;

  // Case 4: last resort, anchor to season start.
  const startIso = parseDateTimeUtc(season.start);
  return startIso || new Date().toISOString();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseSqlInserts(sqlContent: string, tableName: string): string[][] {
  const escapedTable = escapeRegExp(tableName);
  const pattern = new RegExp(
    `INSERT INTO\\s+(?:\\\`[^\\\`]+\\\`\\.)?\\\`${escapedTable}\\\`\\s*\\([\\s\\S]*?\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    "gi"
  );
  const matches = [...sqlContent.matchAll(pattern)];
  if (matches.length === 0) return [];

  const allRows: string[][] = [];
  for (const match of matches) {
    const valuesSection = match[1];
    const rows = splitValueRows(valuesSection);
    for (const row of rows) {
      allRows.push(parseRowValues(row));
    }
  }
  return allRows;
}

function splitValueRows(valuesSection: string): string[] {
  const rows: string[] = [];
  let inQuote = false;
  let depth = 0;
  let startIndex = -1;

  for (let i = 0; i < valuesSection.length; i++) {
    const char = valuesSection[i];
    const prev = i > 0 ? valuesSection[i - 1] : "";

    if (char === "'" && prev !== "\\") {
      inQuote = !inQuote;
    }

    if (!inQuote) {
      if (char === "(") {
        if (depth === 0) {
          startIndex = i + 1;
        }
        depth++;
      } else if (char === ")") {
        depth--;
        if (depth === 0 && startIndex >= 0) {
          rows.push(valuesSection.slice(startIndex, i));
          startIndex = -1;
        }
      }
    }
  }

  return rows;
}

function parseRowValues(rowStr: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuote = false;
  let depth = 0;

  for (let i = 0; i < rowStr.length; i++) {
    const char = rowStr[i];

    if (char === "'" && (i === 0 || rowStr[i - 1] !== "\\")) {
      inQuote = !inQuote;
    } else if (char === "(" && !inQuote) {
      depth++;
    } else if (char === ")" && !inQuote) {
      depth--;
    } else if (char === "," && !inQuote && depth === 0) {
      values.push(current.trim().replace(/^'|'$/g, ""));
      current = "";
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    values.push(current.trim().replace(/^'|'$/g, ""));
  }

  return values;
}

function normalizePsnId(psnId: string) {
  return psnId.trim().toLowerCase();
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function parseYearArg(args: string[]): number | null {
  const yearArg = args.find((arg) => arg.startsWith("--year="));
  if (!yearArg) return null;
  const value = Number(yearArg.split("=")[1]);
  return Number.isFinite(value) ? value : null;
}

function matchKey(teamA: string, teamB: string) {
  return [teamA, teamB].sort().join("::");
}

function normalizeTeamName(teamName: string) {
  return teamName.trim().toLowerCase();
}

function teamKey(seasonCode: string, teamName: string) {
  return `${seasonCode}_${normalizeTeamName(teamName)}`;
}

function upperCount(value: string) {
  const matches = value.match(/[A-Z]/g);
  return matches ? matches.length : 0;
}

function pickPreferredTeamName(current: string | undefined, candidate: string) {
  if (!current) return candidate;
  const candidateScore = upperCount(candidate);
  const currentScore = upperCount(current);
  if (candidateScore !== currentScore) {
    return candidateScore > currentScore ? candidate : current;
  }
  if (candidate.length !== current.length) {
    return candidate.length > current.length ? candidate : current;
  }
  return candidate < current ? candidate : current;
}

type TeamMapEntry = { id: string; name: string };

type SeasonContext = {
  season: SeasonRuntime;
  matchRows: string[][];
  statRows: string[][];
};

async function ensureTable(table: string, message: string) {
  const { error } = await supabase.from(table).select("id").limit(1);
  if (error) {
    console.error(message);
    process.exit(1);
  }
}

async function loadSeasonsFromDb(filterYear: number | null): Promise<SeasonRuntime[]> {
  const { data: seasons, error } = await supabase.from("seasons").select("id, name");
  if (error) throw error;

  const byName = new Map(SEASONS.map((season) => [season.name, season]));
  const runtime: SeasonRuntime[] = [];

  (seasons as SeasonDb[] | null)?.forEach((season) => {
    const def = byName.get(season.name);
    if (!def) return;
    if (filterYear && def.year !== filterYear) return;
    runtime.push({ ...def, id: season.id });
  });

  runtime.sort((a, b) => a.start.localeCompare(b.start));
  return runtime;
}

async function buildTeamMap(seasons: SeasonRuntime[]) {
  const seasonIdToCode = new Map(seasons.map((s) => [s.id, s.code]));
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, season_id");
  if (error) throw error;

  const teamMap = new Map<string, TeamMapEntry>();
  const teamsBySeason = new Map<string, TeamDb[]>();

  (teams as TeamDb[] | null)?.forEach((team) => {
    const code = seasonIdToCode.get(team.season_id);
    if (!code) return;
    const key = teamKey(code, team.name);
    teamMap.set(key, { id: team.id, name: team.name });
    const bucket = teamsBySeason.get(code) || [];
    bucket.push(team);
    teamsBySeason.set(code, bucket);
  });

  return { teamMap, teamsBySeason };
}

async function loadOldProfiles(): Promise<Map<string, OldProfileDb>> {
  const map = new Map<string, OldProfileDb>();
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("old_profiles")
      .select("id, psn_id, psn_id_normalized")
      .range(from, to);
    if (error) throw error;
    const rows = (data as OldProfileDb[] | null) || [];
    rows.forEach((row) => {
      map.set(row.psn_id_normalized, row);
    });
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return map;
}

async function upsertOldProfiles(psnIds: string[]) {
  if (psnIds.length === 0) return;
  const rows = psnIds.map((psnId) => ({
    psn_id: psnId,
    psn_id_normalized: normalizePsnId(psnId),
  }));
  for (const chunk of chunkArray(rows, 500)) {
    const { error } = await supabase
      .from("old_profiles")
      .upsert(chunk, { onConflict: "psn_id_normalized", ignoreDuplicates: true });
    if (error) throw error;
  }
}

async function loadOldRosters(seasonId: string) {
  const { data, error } = await supabase
    .from("old_team_rosters")
    .select("old_profile_id, team_id")
    .eq("season_id", seasonId);
  if (error) throw error;

  const map = new Map<string, string[]>();
  (data as OldRosterDb[] | null)?.forEach((row) => {
    const list = map.get(row.old_profile_id) || [];
    list.push(row.team_id);
    map.set(row.old_profile_id, list);
  });
  return map;
}

async function ensureTeamsForSeason(
  season: SeasonRuntime,
  matchRows: string[][],
  teamMap: Map<string, TeamMapEntry>
) {
  const nameByNormalized = new Map<string, string>();
  matchRows.forEach((row) => {
    const [, homeTeam, awayTeam] = row;
    if (homeTeam && homeTeam.trim()) {
      const trimmed = homeTeam.trim();
      const normalized = normalizeTeamName(trimmed);
      nameByNormalized.set(normalized, pickPreferredTeamName(nameByNormalized.get(normalized), trimmed));
    }
    if (awayTeam && awayTeam.trim()) {
      const trimmed = awayTeam.trim();
      const normalized = normalizeTeamName(trimmed);
      nameByNormalized.set(normalized, pickPreferredTeamName(nameByNormalized.get(normalized), trimmed));
    }
  });

  const missingNames = Array.from(nameByNormalized.entries())
    .filter(([normalized]) => !teamMap.has(teamKey(season.code, normalized)))
    .map(([, preferredName]) => preferredName);

  if (missingNames.length === 0) {
    return { missingNames: 0, upserted: 0 };
  }

  // Ensure teams exist even if previous legacy team migration wasn't run.
  const payload = missingNames.map((name) => ({
    season_id: season.id,
    name,
    // Conference may still be NOT NULL in some DBs; use a safe default.
    conference: "West",
    captain_id: null,
    is_active: false,
    wins: 0,
    losses: 0,
    points_for: 0,
    points_against: 0,
  }));

  let upserted = 0;
  for (const chunk of chunkArray(payload, 200)) {
    const { error } = await supabase.from("teams").upsert(chunk, {
      onConflict: "season_id,name",
      ignoreDuplicates: true,
    });
    if (!error) {
      upserted += chunk.length;
    }
  }

  // Refresh team map for this season only.
  const { data: teams, error } = await supabase
    .from("teams")
    .select("id, name, season_id")
    .eq("season_id", season.id);
  if (!error) {
    (teams as TeamDb[] | null)?.forEach((team) => {
      const key = teamKey(season.code, team.name);
      teamMap.set(key, { id: team.id, name: team.name });
    });
  }

  return { missingNames: missingNames.length, upserted };
}

async function upsertMatchesForSeason(
  season: SeasonRuntime,
  matchRows: string[][],
  teamMap: Map<string, TeamMapEntry>,
  debug: boolean
) {
  if (matchRows.length === 0) return { inserted: 0, skipped: matchRows.length };

  const ensureResult = await ensureTeamsForSeason(season, matchRows, teamMap);

  // Build a quick lookup of existing matches to avoid duplicates without ON CONFLICT.
  let existingMatches: MatchDb[] = [];
  try {
    existingMatches = await loadMatchesForSeason(season.id);
  } catch (existingError: any) {
    console.log(`    WARN failed to load existing matches: ${existingError.message}`);
  }

  const existingKeys = new Set<string>();
  existingMatches.forEach((match) => {
    const matchDateKey = normalizeMatchDateKey(match.match_date);
    existingKeys.add(`${match.home_team_id}::${match.away_team_id}::${matchDateKey}`);
  });

  let inserted = 0;
  let skipped = 0;
  let skippedExisting = 0;
  let insertErrors = 0;
  let missingTeamMappings = 0;
  const missingTeamKeys = new Set<string>();

  for (const row of matchRows) {
    const [dateTime, homeTeam, awayTeam, homePts, awayPts] = row;
    if (!homeTeam || !awayTeam) {
      skipped++;
      continue;
    }
    const homeKey = teamKey(season.code, homeTeam);
    const awayKey = teamKey(season.code, awayTeam);
    const home = teamMap.get(homeKey);
    const away = teamMap.get(awayKey);
    if (!home || !away) {
      skipped++;
      missingTeamMappings++;
      if (!home) missingTeamKeys.add(homeKey);
      if (!away) missingTeamKeys.add(awayKey);
      if (debug) {
        console.log(`    WARN missing team mapping for match: ${homeKey} vs ${awayKey}`);
      }
      continue;
    }

    const matchDate = normalizeMatchDateKey(parseLegacyMatchDate(row, season));

    const payload = {
      season_id: season.id,
      home_team_id: home.id,
      away_team_id: away.id,
      match_date: matchDate,
      home_score: parseInt(homePts) || 0,
      away_score: parseInt(awayPts) || 0,
      status: "finished",
    };

    const key = `${payload.home_team_id}::${payload.away_team_id}::${matchDate}`;
    if (existingKeys.has(key)) {
      skipped++;
      skippedExisting++;
      continue;
    }

    const { error } = await supabase.from("matches").insert(payload);
    if (error) {
      skipped++;
      insertErrors++;
      if (debug) {
        console.log(`    WARN match insert failed: ${error.message}`);
      }
      continue;
    }
    inserted++;
    existingKeys.add(key);
  }

  return {
    inserted,
    skipped,
    skippedExisting,
    insertErrors,
    missingTeamMappings,
    missingTeamKeys,
    teamsEnsured: ensureResult,
  };
}

async function loadMatchesForSeason(seasonId: string): Promise<MatchDb[]> {
  const all: MatchDb[] = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, match_date")
      .eq("season_id", seasonId)
      .order("match_date", { ascending: true })
      .range(from, to);
    if (error) throw error;
    const rows = (data as MatchDb[] | null) || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

async function loadOldMatchCounts(matchIds: string[]) {
  const counts = new Map<string, number>();
  // Keep IN-lists small; PostgREST echoes the URL in headers.
  for (const chunk of chunkArray(matchIds, 100)) {
    const { data, error } = await supabase
      .from("old_match_stats")
      .select("match_id")
      .in("match_id", chunk);
    if (error) throw error;
    (data as Array<{ match_id: string }> | null)?.forEach((row) => {
      counts.set(row.match_id, (counts.get(row.match_id) || 0) + 1);
    });
  }
  return counts;
}

function pickRosterTeam(teamIds: string[]) {
  if (teamIds.length === 0) return null;
  // If a player appears on multiple teams in a season, pick the first and log elsewhere.
  return teamIds[0];
}

function detectLegacyMatchId(statRows: string[][], matchRows: string[][]) {
  const first = statRows[0]?.[0]?.trim();
  if (!first) return false;
  if (/^\d{8}_\d+/.test(first)) return true;
  const matchIdSet = new Set<string>();
  matchRows.forEach((row) => {
    const matchId = row[0]?.trim();
    if (matchId) matchIdSet.add(matchId);
  });
  return matchIdSet.has(first);
}

type LegacyMatchInfo = {
  legacyMatchId: string;
  homeTeamId: string;
  awayTeamId: string;
  matchDate: string;
  candidates: MatchDb[];
};

function buildLegacyMatchMap(
  season: SeasonRuntime,
  matchRows: string[][],
  matches: MatchDb[],
  teamMap: Map<string, TeamMapEntry>
) {
  const exactKeyMap = new Map<string, MatchDb[]>();
  const homeAwayMap = new Map<string, MatchDb[]>();

  matches.forEach((match) => {
    const matchDateKey = normalizeMatchDateKey(match.match_date);
    const exactKey = `${match.home_team_id}::${match.away_team_id}::${matchDateKey}`;
    const exactBucket = exactKeyMap.get(exactKey) || [];
    exactBucket.push(match);
    exactKeyMap.set(exactKey, exactBucket);

    const homeAwayKey = `${match.home_team_id}::${match.away_team_id}`;
    const homeAwayBucket = homeAwayMap.get(homeAwayKey) || [];
    homeAwayBucket.push(match);
    homeAwayMap.set(homeAwayKey, homeAwayBucket);
  });

  const legacyMap = new Map<string, LegacyMatchInfo>();

  matchRows.forEach((row) => {
    const legacyMatchId = row[0]?.trim();
    const homeName = row[1]?.trim();
    const awayName = row[2]?.trim();
    if (!legacyMatchId || !homeName || !awayName) return;

    const homeKey = teamKey(season.code, homeName);
    const awayKey = teamKey(season.code, awayName);
    const homeTeam = teamMap.get(homeKey);
    const awayTeam = teamMap.get(awayKey);
    if (!homeTeam || !awayTeam) return;

    const matchDate = normalizeMatchDateKey(parseLegacyMatchDate(row, season));
    const exactKey = `${homeTeam.id}::${awayTeam.id}::${matchDate}`;
    const homeAwayKey = `${homeTeam.id}::${awayTeam.id}`;

    const candidates = exactKeyMap.get(exactKey) || homeAwayMap.get(homeAwayKey) || [];
    legacyMap.set(legacyMatchId, {
      legacyMatchId,
      homeTeamId: homeTeam.id,
      awayTeamId: awayTeam.id,
      matchDate,
      candidates,
    });
  });

  return legacyMap;
}

function buildTeamOpponents(matches: MatchDb[]) {
  const opponents = new Map<string, Set<string>>();
  matches.forEach((match) => {
    const homeSet = opponents.get(match.home_team_id) || new Set<string>();
    homeSet.add(match.away_team_id);
    opponents.set(match.home_team_id, homeSet);

    const awaySet = opponents.get(match.away_team_id) || new Set<string>();
    awaySet.add(match.home_team_id);
    opponents.set(match.away_team_id, awaySet);
  });
  return opponents;
}

function inferPlayerTeams(
  playerVsTeams: Map<string, Set<string>>,
  teamOpponents: Map<string, Set<string>>,
  rosterMap: Map<string, string[]>
) {
  const inferred = new Map<string, string>();
  const candidateTeams = Array.from(teamOpponents.keys());

  playerVsTeams.forEach((vsTeams, oldProfileId) => {
    if ((rosterMap.get(oldProfileId) || []).length > 0) return;

    let bestTeam: string | null = null;
    let bestScore = 0;

    candidateTeams.forEach((teamId) => {
      const opponents = teamOpponents.get(teamId);
      if (!opponents) return;
      let score = 0;
      vsTeams.forEach((vsTeamId) => {
        if (opponents.has(vsTeamId)) score++;
      });
      if (score > bestScore) {
        bestScore = score;
        bestTeam = teamId;
      }
    });

    if (bestTeam && bestScore > 0) {
      inferred.set(oldProfileId, bestTeam);
    }
  });

  return inferred;
}

type SeasonStatsSummary = {
  season: SeasonRuntime;
  statRows: number;
  matchesParsed: number;
  matchesEnsured: number;
  matchesSkipped: number;
  matchesInDb: number;
  rosterMappings: number;
  upsertsAttempted: number;
  upsertsSucceeded: number;
  missingOldProfile: number;
  missingRosterTeam: number;
  missingVsTeam: number;
  missingMatchup: number;
  multiTeamRoster: number;
};

async function migrateSeasonStats(
  ctx: SeasonContext,
  teamMap: Map<string, TeamMapEntry>,
  oldProfiles: Map<string, OldProfileDb>,
  debug: boolean
): Promise<SeasonStatsSummary> {
  const { season, matchRows, statRows } = ctx;
  console.log(`  Season ${season.name} (${season.code})`);
  console.log(`    Parsed matches: ${matchRows.length.toLocaleString()} | stats: ${statRows.length.toLocaleString()}`);

  const matchResult = await upsertMatchesForSeason(season, matchRows, teamMap, debug);
  if (matchResult.teamsEnsured.missingNames > 0) {
    console.log(
      `    Teams ensured: missing=${matchResult.teamsEnsured.missingNames.toLocaleString()} upserted=${matchResult.teamsEnsured.upserted.toLocaleString()}`
    );
  }
  console.log(
    `    Matches ensured: ${matchResult.inserted.toLocaleString()} upserts, ${matchResult.skipped.toLocaleString()} skipped`
  );
  if (matchResult.skippedExisting > 0 || matchResult.insertErrors > 0) {
    console.log(
      `    Match skips: existing=${matchResult.skippedExisting.toLocaleString()} errors=${matchResult.insertErrors.toLocaleString()}`
    );
  }
  if (matchResult.missingTeamMappings > 0) {
    const sample = Array.from(matchResult.missingTeamKeys).slice(0, 6).join(", ");
    console.log(
      `    WARN missing team mappings: ${matchResult.missingTeamMappings.toLocaleString()} (sample: ${sample})`
    );
  }

  const hasLegacyMatchId = detectLegacyMatchId(statRows, matchRows);
  const psnIndex = hasLegacyMatchId ? 1 : 0;
  const vsIndex = hasLegacyMatchId ? 2 : 1;
  const statsOffset = hasLegacyMatchId ? 3 : 2;
  if (hasLegacyMatchId) {
    console.log("    Stat format: match_id + psnId + vs");
  }

  // Ensure old profiles for this season's stats
  const seasonPsnIds = new Set<string>();
  statRows.forEach((row) => {
    const psnId = row[psnIndex];
    if (psnId && psnId.trim()) {
      seasonPsnIds.add(psnId.trim());
    }
  });

  const missingProfiles = Array.from(seasonPsnIds).filter((psnId) => !oldProfiles.has(normalizePsnId(psnId)));
  if (missingProfiles.length > 0) {
    console.log(`    Missing old_profiles detected: ${missingProfiles.length.toLocaleString()} (upserting now)`);
    await upsertOldProfiles(missingProfiles);
    const refreshed = await loadOldProfiles();
    oldProfiles.clear();
    refreshed.forEach((value, key) => oldProfiles.set(key, value));
  }

  const matches = await loadMatchesForSeason(season.id);
  console.log(`    Matches in DB for season: ${matches.length.toLocaleString()}`);
  if (matches.length === 0) {
    console.log("    WARN no matches in DB; skipping stats for this season");
    return {
      season,
      statRows: statRows.length,
      matchesParsed: matchRows.length,
      matchesEnsured: matchResult.inserted,
      matchesSkipped: matchResult.skipped,
      matchesInDb: matches.length,
      rosterMappings: 0,
      upsertsAttempted: 0,
      upsertsSucceeded: 0,
      missingOldProfile: statRows.length,
      missingRosterTeam: 0,
      missingVsTeam: 0,
      missingMatchup: 0,
      multiTeamRoster: 0,
    };
  }

  const matchIds = matches.map((match) => match.id);
  const oldMatchCounts = await loadOldMatchCounts(matchIds);

  const matchupMap = new Map<string, MatchDb[]>();
  matches.forEach((match) => {
    const key = matchKey(match.home_team_id, match.away_team_id);
    const bucket = matchupMap.get(key) || [];
    bucket.push(match);
    matchupMap.set(key, bucket);
  });

  const rosterMap = await loadOldRosters(season.id);
  console.log(`    Old roster mappings: ${rosterMap.size.toLocaleString()}`);

  const legacyMatchMap = hasLegacyMatchId
    ? buildLegacyMatchMap(season, matchRows, matches, teamMap)
    : new Map<string, LegacyMatchInfo>();
  if (hasLegacyMatchId) {
    console.log(`    Legacy match ids mapped: ${legacyMatchMap.size.toLocaleString()}`);
  }

  const teamOpponents = buildTeamOpponents(matches);
  const playerVsTeams = new Map<string, Set<string>>();
  statRows.forEach((row) => {
    const psnId = row[psnIndex]?.trim();
    const vs = row[vsIndex]?.trim();
    if (!psnId || !vs) return;
    const oldProfile = oldProfiles.get(normalizePsnId(psnId));
    if (!oldProfile) return;
    const vsTeam = teamMap.get(teamKey(season.code, vs));
    if (!vsTeam) return;
    const bucket = playerVsTeams.get(oldProfile.id) || new Set<string>();
    bucket.add(vsTeam.id);
    playerVsTeams.set(oldProfile.id, bucket);
  });
  const inferredTeams = inferPlayerTeams(playerVsTeams, teamOpponents, rosterMap);
  if (inferredTeams.size > 0) {
    console.log(`    Inferred roster teams: ${inferredTeams.size.toLocaleString()}`);
    if (debug) {
      const sample = Array.from(inferredTeams.entries()).slice(0, 3);
      console.log(`    DEBUG inferred sample: ${sample.map(([p, t]) => `${p}->${t}`).join(", ")}`);
    }
  }

  const pending: Array<Record<string, unknown>> = [];
  let missingOldProfile = 0;
  let missingRosterTeam = 0;
  let missingVsTeam = 0;
  let missingMatchup = 0;
  let multiTeamRoster = 0;
  let missingLegacyMatch = 0;

  const missingTeamKeys = new Set<string>();
  const missingMatchupKeys = new Set<string>();
  const missingLegacyMatchIds = new Set<string>();

  statRows.forEach((row, index) => {
    const legacyMatchId = hasLegacyMatchId ? row[0]?.trim() : null;
    const psnId = row[psnIndex]?.trim();
    const vs = row[vsIndex]?.trim();
    if (!psnId || !vs) return;

    const stats = row.slice(statsOffset);
    const [pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, tpm, tpa] = stats;

    const normalized = normalizePsnId(psnId);
    const oldProfile = oldProfiles.get(normalized);
    if (!oldProfile) {
      missingOldProfile++;
      return;
    }

    const vsKey = teamKey(season.code, vs);
    const vsTeam = teamMap.get(vsKey);
    if (!vsTeam) {
      missingVsTeam++;
      missingTeamKeys.add(vsKey);
      return;
    }

    const rosterTeams = rosterMap.get(oldProfile.id) || [];
    if (rosterTeams.length > 1) {
      multiTeamRoster++;
    }

    const legacyInfo = legacyMatchId ? legacyMatchMap.get(legacyMatchId) : null;
    if (legacyMatchId && !legacyInfo) {
      missingLegacyMatch++;
      missingLegacyMatchIds.add(`${season.code}:${legacyMatchId}`);
    }

    let playerTeamId: string | null = null;
    if (legacyInfo) {
      if (vsTeam.id === legacyInfo.homeTeamId) {
        playerTeamId = legacyInfo.awayTeamId;
      } else if (vsTeam.id === legacyInfo.awayTeamId) {
        playerTeamId = legacyInfo.homeTeamId;
      }
    }
    if (!playerTeamId) {
      playerTeamId = pickRosterTeam(rosterTeams) || inferredTeams.get(oldProfile.id) || null;
    }
    if (!playerTeamId) {
      missingRosterTeam++;
      return;
    }

    const matchupKey = matchKey(playerTeamId, vsTeam.id);
    let matchupMatches: MatchDb[] = [];
    if (legacyInfo && legacyInfo.candidates.length > 0) {
      matchupMatches = legacyInfo.candidates;
    } else if (legacyInfo) {
      const legacyMatchupKey = matchKey(legacyInfo.homeTeamId, legacyInfo.awayTeamId);
      matchupMatches = matchupMap.get(legacyMatchupKey) || [];
    } else {
      matchupMatches = matchupMap.get(matchupKey) || [];
    }

    if (matchupMatches.length === 0) {
      missingMatchup++;
      missingMatchupKeys.add(`${season.code}:${matchupKey}`);
      return;
    }

    // Pick the match with the fewest assigned legacy stats so far.
    let chosen = matchupMatches[0];
    let chosenCount = oldMatchCounts.get(chosen.id) || 0;
    for (const candidate of matchupMatches) {
      const count = oldMatchCounts.get(candidate.id) || 0;
      if (count < chosenCount) {
        chosen = candidate;
        chosenCount = count;
      }
    }
    oldMatchCounts.set(chosen.id, chosenCount + 1);

    // If we know the opponent, derive the player's team from the chosen match.
    if (vsTeam.id === chosen.home_team_id) {
      playerTeamId = chosen.away_team_id;
    } else if (vsTeam.id === chosen.away_team_id) {
      playerTeamId = chosen.home_team_id;
    }

    pending.push({
      legacy_row_id: `${season.code}:${index}`,
      match_id: chosen.id,
      team_id: playerTeamId,
      old_profile_id: oldProfile.id,
      pts: parseInt(pts) || 0,
      reb: parseInt(reb) || 0,
      ast: parseInt(ast) || 0,
      stl: parseInt(stl) || 0,
      blk: parseInt(blk) || 0,
      fls: parseInt(fls) || 0,
      turnovers: parseInt(turnovers) || 0,
      fgm: parseInt(fgm) || 0,
      fga: parseInt(fga) || 0,
      three_pm: parseInt(tpm) || 0,
      three_pa: parseInt(tpa) || 0,
      ftm: 0,
      fta: 0,
    });
  });

  if (missingTeamKeys.size > 0) {
    console.log(`    WARN missing vs teams: ${missingTeamKeys.size} (sample: ${Array.from(missingTeamKeys).slice(0, 5).join(", ")})`);
  }
  if (missingMatchupKeys.size > 0 && debug) {
    console.log(`    WARN missing matchups: ${missingMatchupKeys.size} (sample: ${Array.from(missingMatchupKeys).slice(0, 5).join(", ")})`);
  }
  if (missingLegacyMatchIds.size > 0) {
    console.log(
      `    WARN missing legacy match ids: ${missingLegacyMatchIds.size} (sample: ${Array.from(missingLegacyMatchIds)
        .slice(0, 5)
        .join(", ")})`
    );
  }

  let upsertsSucceeded = 0;
  for (const chunk of chunkArray(pending, 500)) {
    const { error } = await supabase
      .from("old_match_stats")
      .upsert(chunk, { onConflict: "legacy_row_id", ignoreDuplicates: true });
    if (error) {
      console.log(`    WARN old_match_stats upsert error: ${error.message}`);
      continue;
    }
    upsertsSucceeded += chunk.length;
  }

  console.log(
    "    Summary: " +
      `pending=${pending.length.toLocaleString()} ` +
      `inserted=${upsertsSucceeded.toLocaleString()} ` +
      `missingProfile=${missingOldProfile.toLocaleString()} ` +
      `missingRoster=${missingRosterTeam.toLocaleString()} ` +
      `missingVsTeam=${missingVsTeam.toLocaleString()} ` +
      `missingLegacyMatch=${missingLegacyMatch.toLocaleString()} ` +
      `missingMatch=${missingMatchup.toLocaleString()} ` +
      `multiTeamRoster=${multiTeamRoster.toLocaleString()}`
  );

  return {
    season,
    statRows: statRows.length,
    matchesParsed: matchRows.length,
    matchesEnsured: matchResult.inserted,
    matchesSkipped: matchResult.skipped,
    matchesInDb: matches.length,
    rosterMappings: rosterMap.size,
    upsertsAttempted: pending.length,
    upsertsSucceeded,
    missingOldProfile,
    missingRosterTeam,
    missingVsTeam,
    missingMatchup,
    multiTeamRoster,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const debug = args.includes("--debug");
  const parseOnly = args.includes("--parse-only");
  const yearFilter = parseYearArg(args);

  console.log("Legacy old_match_stats migration (year-by-year)");
  console.log("=".repeat(72));
  if (yearFilter) {
    console.log(`Year filter: ${yearFilter}`);
  }
  if (parseOnly) {
    console.log("Mode: parse-only (no Supabase writes)");
  }
  console.log("=".repeat(72));

  const sqlPath = path.join(__dirname, "../supabase/kpl_all.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");

  // Quick parse diagnostics first (works without network writes)
  const parseDiagnostics = SEASONS.filter((season) => !yearFilter || season.year === yearFilter).map((season) => {
    const matchRows = parseSqlInserts(sqlContent, `${season.code}_match`);
    const statRows = parseSqlInserts(sqlContent, `${season.code}_stats`);
    return { season, matchRows: matchRows.length, statRows: statRows.length };
  });
  console.log("Parse diagnostics (rows found in SQL):");
  parseDiagnostics.forEach((row) => {
    console.log(
      `  ${row.season.code.padEnd(10)} matches=${row.matchRows.toString().padStart(5)} stats=${row.statRows
        .toString()
        .padStart(6)}`
    );
  });

  if (parseOnly) {
    console.log("\nParse-only mode complete.");
    process.exit(0);
  }

  await ensureTable("old_profiles", "Missing old_profiles. Run migration 042_add_old_profiles_and_stats.sql first.");
  await ensureTable("old_match_stats", "Missing old_match_stats. Run migration 042_add_old_profiles_and_stats.sql first.");
  await ensureTable("old_team_rosters", "Missing old_team_rosters. Run migration 043_add_old_team_rosters.sql first.");

  const seasons = await loadSeasonsFromDb(yearFilter);
  if (seasons.length === 0) {
    console.log("No matching seasons found in DB for the requested year filter.");
    return;
  }

  const { teamMap, teamsBySeason } = await buildTeamMap(seasons);
  console.log("\nTeam diagnostics (teams found in DB):");
  seasons.forEach((season) => {
    const teams = teamsBySeason.get(season.code) || [];
    console.log(`  ${season.code.padEnd(10)} teams=${teams.length}`);
  });

  const oldProfiles = await loadOldProfiles();
  console.log(`\nOld profiles loaded: ${oldProfiles.size.toLocaleString()}`);

  // Build per-season contexts
  const contexts: SeasonContext[] = seasons.map((season) => ({
    season,
    matchRows: parseSqlInserts(sqlContent, `${season.code}_match`),
    statRows: parseSqlInserts(sqlContent, `${season.code}_stats`),
  }));

  // Process by year blocks for clearer logging
  const years = Array.from(new Set(contexts.map((ctx) => ctx.season.year))).sort();
  const allSummaries: SeasonStatsSummary[] = [];

  for (const year of years) {
    console.log("\n" + "#".repeat(72));
    console.log(`YEAR ${year}`);
    console.log("#".repeat(72));

    const yearContexts = contexts.filter((ctx) => ctx.season.year === year);
    for (const ctx of yearContexts) {
      const summary = await migrateSeasonStats(ctx, teamMap, oldProfiles, debug);
      allSummaries.push(summary);
    }

    const yearSummary = allSummaries.filter((summary) => summary.season.year === year);
    const yearInserted = yearSummary.reduce((sum, row) => sum + row.upsertsSucceeded, 0);
    const yearAttempted = yearSummary.reduce((sum, row) => sum + row.upsertsAttempted, 0);
    const yearMissingMatch = yearSummary.reduce((sum, row) => sum + row.missingMatchup, 0);
    console.log(
      `\nYEAR ${year} totals: attempted=${yearAttempted.toLocaleString()} inserted=${yearInserted.toLocaleString()} missingMatch=${yearMissingMatch.toLocaleString()}`
    );
  }

  console.log("\n" + "=".repeat(72));
  const totalAttempted = allSummaries.reduce((sum, row) => sum + row.upsertsAttempted, 0);
  const totalInserted = allSummaries.reduce((sum, row) => sum + row.upsertsSucceeded, 0);
  const totalMissingMatch = allSummaries.reduce((sum, row) => sum + row.missingMatchup, 0);
  console.log(
    `DONE: attempted=${totalAttempted.toLocaleString()} inserted=${totalInserted.toLocaleString()} missingMatch=${totalMissingMatch.toLocaleString()}`
  );
  console.log("=".repeat(72));
  process.exit(0);
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
