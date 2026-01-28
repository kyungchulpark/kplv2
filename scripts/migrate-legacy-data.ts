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

// Season configuration
const SEASONS = [
  { name: "2020 Season 1st", code: "2020_1st", start: "2020-10-01", end: "2020-12-31" },
  { name: "2021 Season 2nd", code: "2021_2nd", start: "2021-04-01", end: "2021-06-30" },
  { name: "2021 Season 3rd", code: "2021_3rd", start: "2021-07-01", end: "2021-09-30" },
  { name: "2021 Season 4th", code: "2021_4th", start: "2021-10-01", end: "2021-12-31" },
  { name: "2022 Season 1st", code: "2022_1st", start: "2022-01-01", end: "2022-03-31" },
  { name: "2022 Season 2nd", code: "2022_2nd", start: "2022-04-01", end: "2022-06-30" },
  { name: "2022 Season 3rd", code: "2022_3rd", start: "2022-07-01", end: "2022-09-30" },
  { name: "2023 Season 1st", code: "2023_1st", start: "2023-01-01", end: "2023-03-31" },
  { name: "2023 Season 2nd", code: "2023_2nd", start: "2023-04-01", end: "2023-06-30" },
  { name: "2023 Season 3rd", code: "2023_3rd", start: "2023-07-01", end: "2023-09-30" },
  { name: "2024 Season 1st", code: "2024_1st", start: "2024-01-01", end: "2024-03-31" },
  { name: "2024 Season 2nd", code: "2024_2nd", start: "2024-04-01", end: "2024-06-30" },
  { name: "2024 Season 3rd", code: "2024_3rd", start: "2024-07-01", end: "2024-09-30" },
  { name: "2024 Season 4th", code: "2024_4th", start: "2024-10-01", end: "2024-12-31" },
  { name: "2025 Season 1st", code: "2025_1st", start: "2025-01-01", end: "2025-03-31" },
  { name: "2025 Season 2nd", code: "2025_2nd", start: "2025-04-01", end: "2025-06-30" },
  { name: "2025 Season 3rd", code: "2025_3nd", start: "2025-07-01", end: "2025-09-30" },
  { name: "2026 Season 1st", code: "current", start: "2025-10-26", end: "2026-03-31" },
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parse SQL INSERT statements
function parseSqlInserts(sqlContent: string, tableName: string): string[][] {
  const escapedTable = escapeRegExp(tableName);
  const pattern = new RegExp(
    `INSERT INTO\\s+(?:\\\`[^\\\`]+\\\`\\.)?\\\`${escapedTable}\\\`\\s*\\([\\s\\S]*?\\)\\s*VALUES\\s*([\\s\\S]*?);`,
    "gi"
  );
  const matches = [...sqlContent.matchAll(pattern)];

  if (matches.length === 0) return [];

  const allRows: string[][] = [];

  matches.forEach((match) => {
    const valuesSection = match[1];
    const rows = splitValueRows(valuesSection);
    rows.forEach((row) => {
      const values = parseRowValues(row);
      allRows.push(values);
    });
  });

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

async function main() {
  const args = new Set(process.argv.slice(2));
  const skipSeasons = args.has("--skip-seasons");
  const skipTeams = args.has("--skip-teams");
  const skipMatches = args.has("--skip-matches");
  const skipStats = args.has("--skip-stats");
  const skipRosters = args.has("--skip-rosters");
  const debug = args.has("--debug");

  console.log("Starting KPL legacy data migration\n");
  console.log("=".repeat(60));

  // Read SQL file
  const sqlPath = path.join(__dirname, "../supabase/kpl_all.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  console.log(`Reading SQL file: ${sqlPath}`);
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");
  console.log(`SQL file loaded (${(sqlContent.length / 1024 / 1024).toFixed(2)} MB)\n`);

  if (debug) {
    const tables = new Set<string>();
    const tablePattern = /INSERT INTO\s+(?:`[^`]+`\.)?`([^`]+)`/gi;
    let match: RegExpExecArray | null;
    while ((match = tablePattern.exec(sqlContent))) {
      tables.add(match[1]);
    }
    console.log(`DEBUG: Found ${tables.size} tables in SQL.`);
    console.log(`DEBUG: Sample tables: ${Array.from(tables).slice(0, 12).join(", ")}`);
  }

  const { error: oldProfilesCheckError } = await supabase
    .from("old_profiles")
    .select("id")
    .limit(1);

  if (oldProfilesCheckError) {
    console.error("Missing table old_profiles. Run migration 042_add_old_profiles_and_stats.sql first.");
    process.exit(1);
  }

  const { error: oldStatsCheckError } = await supabase
    .from("old_match_stats")
    .select("id")
    .limit(1);

  if (oldStatsCheckError) {
    console.error("Missing table old_match_stats. Run migration 042_add_old_profiles_and_stats.sql first.");
    process.exit(1);
  }

  const { error: oldRostersCheckError } = await supabase
    .from("old_team_rosters")
    .select("id")
    .limit(1);

  if (oldRostersCheckError) {
    console.error("Missing table old_team_rosters. Run migration 043_add_old_team_rosters.sql first.");
    process.exit(1);
  }

  // Step 1: Create Seasons
  console.log("=".repeat(60));
  console.log("[1/6] Creating Seasons");
  console.log("=".repeat(60));

  const seasonMap = new Map<string, { id: string; name: string }>();

  if (!skipSeasons) {
    const { data: existingActiveSeason } = await supabase
      .from("seasons")
      .select("id, name")
      .eq("is_active", true)
      .maybeSingle();
    const hasActiveSeason = !!existingActiveSeason;

    if (hasActiveSeason) {
      console.log(
        `  NOTE Active season already set: ${existingActiveSeason?.name}. ` +
        `Imported seasons will be inactive.`
      );
    }

    for (const season of SEASONS) {
      try {
        const { data, error } = await supabase
          .from("seasons")
          .upsert(
            {
              name: season.name,
              start_date: season.start,
              end_date: season.end,
              is_active: !hasActiveSeason && season.code === "current",
            },
            {
              onConflict: "name",
              ignoreDuplicates: false,
            }
          )
          .select()
          .single();

        if (error) throw error;

        seasonMap.set(season.code, { id: data.id, name: data.name });
        console.log(`  OK ${season.name}`);
      } catch (err: any) {
        console.error(`  FAIL ${season.name}: ${err.message}`);
      }
    }
    console.log(`\nCreated ${seasonMap.size}/${SEASONS.length} seasons\n`);
  } else {
    const { data: seasons } = await supabase.from("seasons").select("id, name");
    const nameToCode = new Map(SEASONS.map((s) => [s.name, s.code]));
    seasons?.forEach((season) => {
      const code = nameToCode.get(season.name);
      if (code) {
        seasonMap.set(code, { id: season.id, name: season.name });
      }
    });
    console.log(`  SKIP seasons: loaded ${seasonMap.size} from DB\n`);
  }

  // Step 2: Build legacy profile list from stats tables
  console.log("=".repeat(60));
  console.log("[2/6] Preparing legacy profiles (old_profiles)");
  console.log("=".repeat(60));

  const legacyPsnIds = new Set<string>();

  for (const seasonCode of seasonMap.keys()) {
    const statsData = parseSqlInserts(sqlContent, `${seasonCode}_stats`);
    if (debug) {
      console.log(`  DEBUG ${seasonCode}_stats rows: ${statsData.length}`);
      if (statsData.length > 0) {
        console.log(`  DEBUG ${seasonCode}_stats sample: ${statsData[0].slice(0, 5).join(", ")}`);
      }
    }
    statsData.forEach((row) => {
      const psnId = row[0];
      if (psnId && psnId.trim().length > 0) {
        legacyPsnIds.add(psnId.trim());
      }
    });

    const leagerData = parseSqlInserts(sqlContent, `${seasonCode}_leager`);
    if (debug) {
      console.log(`  DEBUG ${seasonCode}_leager rows: ${leagerData.length}`);
      if (leagerData.length > 0) {
        console.log(`  DEBUG ${seasonCode}_leager sample: ${leagerData[0].slice(0, 3).join(", ")}`);
      }
    }
    leagerData.forEach((row) => {
      const psnId = row[0];
      if (psnId && psnId.trim().length > 0) {
        legacyPsnIds.add(psnId.trim());
      }
    });
  }

  const legacyProfiles = Array.from(legacyPsnIds).map((psnId) => ({
    psn_id: psnId,
    psn_id_normalized: normalizePsnId(psnId),
  }));

  if (legacyProfiles.length > 0) {
    for (const chunk of chunkArray(legacyProfiles, 500)) {
      const { error } = await supabase
        .from("old_profiles")
        .upsert(chunk, {
          onConflict: "psn_id_normalized",
          ignoreDuplicates: true,
        });

      if (error) {
        console.error("  FAIL inserting old_profiles:", error.message);
      }
    }
  }

  const { data: oldProfiles } = await supabase
    .from("old_profiles")
    .select("id, psn_id_normalized");

  const oldProfileMap = new Map<string, string>();
  oldProfiles?.forEach((p) => oldProfileMap.set(p.psn_id_normalized, p.id));

  console.log(`  Loaded ${oldProfileMap.size} legacy profiles\n`);

  // Step 3: Migrate Teams
  console.log("=".repeat(60));
  console.log("[3/6] Migrating Teams");
  console.log("=".repeat(60));

  const teamMap = new Map<string, { id: string; name: string }>();

  if (!skipTeams) {
    for (const [seasonCode, seasonData] of seasonMap) {
      const matchData = parseSqlInserts(sqlContent, `${seasonCode}_match`);
      if (debug) {
        console.log(`  DEBUG ${seasonCode}_match rows: ${matchData.length}`);
        if (matchData.length > 0) {
          console.log(`  DEBUG ${seasonCode}_match sample: ${matchData[0].slice(0, 5).join(", ")}`);
        }
      }

      if (matchData.length === 0) {
        console.log(`  SKIP ${seasonCode}: no matches`);
        continue;
      }

      const teamNames = new Set<string>();
      matchData.forEach((row) => {
        if (row[1]) teamNames.add(row[1].trim()); // home
        if (row[2]) teamNames.add(row[2].trim()); // away
      });

      console.log(`  ${seasonData.name}: ${teamNames.size} teams`);

      for (const teamName of teamNames) {
        try {
          const { data, error } = await supabase
            .from("teams")
            .upsert(
              {
                name: teamName,
                season_id: seasonData.id,
                conference: null,
                captain_id: null,
                is_active: seasonCode === "current",
                wins: 0,
                losses: 0,
                points_for: 0,
                points_against: 0,
              },
              {
                onConflict: "name,season_id",
                ignoreDuplicates: false,
              }
            )
            .select()
            .single();

          if (error) throw error;

          teamMap.set(`${seasonCode}_${teamName}`, { id: data.id, name: teamName });
        } catch (err: any) {
          console.error(`    FAIL ${teamName}: ${err.message}`);
        }
      }
    }
    console.log(`\nMigrated ${teamMap.size} teams\n`);
  } else {
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, season_id");
    for (const team of teams || []) {
      const seasonEntry = Array.from(seasonMap.entries()).find(
        ([, data]) => data.id === team.season_id
      );
      if (seasonEntry) {
        const [seasonCode] = seasonEntry;
        teamMap.set(`${seasonCode}_${team.name}`, { id: team.id, name: team.name });
      }
    }
    console.log(`  SKIP teams: loaded ${teamMap.size} from DB\n`);
  }

  // Step 4: Migrate Matches
  console.log("=".repeat(60));
  console.log("[4/6] Migrating Matches");
  console.log("=".repeat(60));

  let matchCount = 0;
  let matchErrors = 0;

  if (!skipMatches) {
    for (const [seasonCode, seasonData] of seasonMap) {
      const matchData = parseSqlInserts(sqlContent, `${seasonCode}_match`);
      if (debug) {
        console.log(`  DEBUG ${seasonCode}_match rows: ${matchData.length}`);
      }

      if (matchData.length === 0) {
        console.log(`  ${seasonData.name}: no match data found`);
        continue;
      }

      console.log(`  ${seasonData.name}: processing ${matchData.length} matches...`);

      let seasonMatchCount = 0;
      for (let i = 0; i < matchData.length; i++) {
        const row = matchData[i];
        const [dateTime, homeTeam, awayTeam, homePts, awayPts] = row;

        if (!homeTeam || !awayTeam) {
          if (debug) {
            console.log(`    SKIP row ${i}: missing team (home: ${homeTeam}, away: ${awayTeam})`);
          }
          continue;
        }

        const homeTeamData = teamMap.get(`${seasonCode}_${homeTeam?.trim()}`);
        const awayTeamData = teamMap.get(`${seasonCode}_${awayTeam?.trim()}`);

        if (!homeTeamData || !awayTeamData) {
          if (debug) {
            console.log(`    SKIP row ${i}: team not found (home: ${homeTeam}, away: ${awayTeam})`);
          }
          matchErrors++;
          continue;
        }

        try {
          const { error } = await supabase.from("matches").upsert(
            {
              season_id: seasonData.id,
              home_team_id: homeTeamData.id,
              away_team_id: awayTeamData.id,
              home_score: parseInt(homePts) || 0,
              away_score: parseInt(awayPts) || 0,
              match_date: dateTime || new Date().toISOString(),
              status: "finished",
            },
            {
              onConflict: "season_id,home_team_id,away_team_id,match_date",
              ignoreDuplicates: true,
            }
          );

          if (error) {
            console.log(`    ERROR row ${i}: ${error.message}`);
            matchErrors++;
          } else {
            matchCount++;
            seasonMatchCount++;
          }
        } catch (err: any) {
          console.log(`    ERROR row ${i}: ${err.message}`);
          matchErrors++;
        }

        // Progress indicator
        if ((i + 1) % 50 === 0) {
          console.log(`    Progress: ${i + 1}/${matchData.length} (${((i + 1) / matchData.length * 100).toFixed(1)}%)`);
        }
      }
      console.log(`    ${seasonData.name}: ${seasonMatchCount} matches inserted`);
    }
    console.log(`\nMigrated ${matchCount} matches (${matchErrors} errors)\n`);
  } else {
    console.log("  SKIP matches\n");
  }

  // Step 5: Migrate Stats -> old_match_stats
  console.log("=".repeat(60));
  console.log("[5/6] Migrating Player Stats (old_match_stats)");
  console.log("=".repeat(60));

  let statsCount = 0;
  let statsErrors = 0;
  let statsSkipped = 0;

  if (!skipStats) {
    for (const [seasonCode, seasonData] of seasonMap) {
      const statsData = parseSqlInserts(sqlContent, `${seasonCode}_stats`);
      if (debug) {
        console.log(`  DEBUG ${seasonCode}_stats rows: ${statsData.length}`);
        if (statsData.length > 0) {
          console.log(`  DEBUG ${seasonCode}_stats first row columns: ${statsData[0].length}`);
          console.log(`  DEBUG ${seasonCode}_stats sample row: ${JSON.stringify(statsData[0])}`);
        }
      }

      if (statsData.length === 0) {
        console.log(`  ${seasonData.name}: no stats data found`);
        continue;
      }

      console.log(`  ${seasonData.name}: processing ${statsData.length} stat rows...`);

      // Get all matches for this season
      const { data: matches } = await supabase
        .from("matches")
        .select("id, home_team_id, away_team_id, match_date")
        .eq("season_id", seasonData.id);

      if (!matches || matches.length === 0) {
        console.log(`    WARN: No matches found for ${seasonData.name}, skipping stats`);
        statsSkipped += statsData.length;
        continue;
      }

      console.log(`    Found ${matches.length} matches for this season`);

      const pending: any[] = [];
      let missingProfileCount = 0;
      let missingTeamCount = 0;
      let missingMatchCount = 0;

      statsData.forEach((row, index) => {
        // Support both 13 and 15 column formats (with/without FTM, FTA)
        const [psnId, vs, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, tpm, tpa, ftm, fta] = row;

        if (!psnId || !vs) {
          if (debug && index < 5) {
            console.log(`    SKIP row ${index}: missing psnId or vs (${psnId}, ${vs})`);
          }
          statsSkipped++;
          return;
        }

        const normalized = normalizePsnId(psnId);
        let oldProfileId = oldProfileMap.get(normalized);

        if (!oldProfileId) {
          // Safety: insert missing legacy profile
          pending.push({
            _missingProfile: { psn_id: psnId.trim(), psn_id_normalized: normalized },
          });
          missingProfileCount++;
          return;
        }

        const vsTeamData = teamMap.get(`${seasonCode}_${vs.trim()}`);
        if (!vsTeamData) {
          if (debug && missingTeamCount < 5) {
            console.log(`    SKIP row ${index}: team not found (${vs})`);
          }
          missingTeamCount++;
          statsSkipped++;
          return;
        }

        // Find a match where the opponent team appears
        const match = matches.find(
          (m) => m.home_team_id === vsTeamData.id || m.away_team_id === vsTeamData.id
        );

        if (!match) {
          if (debug && missingMatchCount < 5) {
            console.log(`    SKIP row ${index}: no match found for vs team ${vs}`);
          }
          missingMatchCount++;
          statsSkipped++;
          return;
        }

        const teamId = match.home_team_id === vsTeamData.id ? match.away_team_id : match.home_team_id;

        pending.push({
          legacy_row_id: `${seasonCode}:${index}`,
          match_id: match.id,
          team_id: teamId,
          old_profile_id: oldProfileId,
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
          ftm: ftm ? parseInt(ftm) || 0 : 0,
          fta: fta ? parseInt(fta) || 0 : 0,
        });
      });

      if (missingProfileCount > 0) {
        console.log(`    INFO: ${missingProfileCount} stats have missing profiles (will create them)`);
      }
      if (missingTeamCount > 0) {
        console.log(`    WARN: ${missingTeamCount} stats skipped due to missing teams`);
      }
      if (missingMatchCount > 0) {
        console.log(`    WARN: ${missingMatchCount} stats skipped due to missing matches`);
      }

      if (pending.length === 0) continue;

    // Insert any missing profiles found during stats parse
    const missingProfiles = pending
      .filter((p) => p._missingProfile)
      .map((p) => p._missingProfile);

    if (missingProfiles.length > 0) {
      const uniqueMissing = Array.from(
        new Map(
          missingProfiles.map((p: any) => [p.psn_id_normalized, p])
        ).values()
      );

      for (const chunk of chunkArray(uniqueMissing, 500)) {
        await supabase.from("old_profiles").upsert(chunk, {
          onConflict: "psn_id_normalized",
          ignoreDuplicates: true,
        });
      }

      const { data: refreshed } = await supabase
        .from("old_profiles")
        .select("id, psn_id_normalized");

      oldProfileMap.clear();
      refreshed?.forEach((p) => oldProfileMap.set(p.psn_id_normalized, p.id));

      // Remove placeholder rows and rebuild pending stats with updated map
      const rebuilt: any[] = [];
      statsData.forEach((row, index) => {
        const [psnId, vs, pts, reb, ast, stl, blk, fls, turnovers, fgm, fga, tpm, tpa] = row;
        if (!psnId || !vs) return;
        const normalized = normalizePsnId(psnId);
        const oldProfileId = oldProfileMap.get(normalized);
        if (!oldProfileId) return;
        const vsTeamData = teamMap.get(`${seasonCode}_${vs.trim()}`);
        if (!vsTeamData) return;
        const match = matches.find(
          (m) => m.home_team_id === vsTeamData.id || m.away_team_id === vsTeamData.id
        );
        if (!match) return;
        const teamId = match.home_team_id === vsTeamData.id ? match.away_team_id : match.home_team_id;
        rebuilt.push({
          legacy_row_id: `${seasonCode}:${index}`,
          match_id: match.id,
          team_id: teamId,
          old_profile_id: oldProfileId,
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

      pending.length = 0;
      pending.push(...rebuilt);
    }

    const statChunks = chunkArray(
      pending.filter((p) => !p._missingProfile),
      500
    );

      console.log(`    Inserting ${statChunks.length * 500} stats in ${statChunks.length} chunks...`);
      for (let i = 0; i < statChunks.length; i++) {
        const chunk = statChunks[i];
        const { error } = await supabase
          .from("old_match_stats")
          .upsert(chunk, { onConflict: "legacy_row_id", ignoreDuplicates: true });

        if (error) {
          console.log(`    ERROR chunk ${i}: ${error.message}`);
          statsErrors += chunk.length;
        } else {
          statsCount += chunk.length;
        }

        if ((i + 1) % 10 === 0) {
          console.log(`    Progress: ${i + 1}/${statChunks.length} chunks (${((i + 1) / statChunks.length * 100).toFixed(1)}%)`);
        }
      }
    }

    console.log(`\nMigrated ${statsCount} legacy stat rows (${statsErrors} errors, ${statsSkipped} skipped)`);
  } else {
    console.log("  SKIP stats\n");
  }

  console.log("=".repeat(60));
  console.log("[6/6] Migrating Team Rosters (old_team_rosters)");
  console.log("=".repeat(60));

  if (!skipRosters) {
    let rosterCount = 0;
    let rosterErrors = 0;
    const missingTeams = new Set<string>();
    const missingProfiles = new Set<string>();

    for (const [seasonCode, seasonData] of seasonMap) {
      const leagerData = parseSqlInserts(sqlContent, `${seasonCode}_leager`);

      if (leagerData.length === 0) {
        if (debug) {
          console.log(`  DEBUG ${seasonCode}_leager rows: 0`);
        }
        console.log(`  ${seasonData.name}: no roster data found`);
        continue;
      }

      console.log(`  ${seasonData.name}: processing ${leagerData.length} roster rows...`);

      const pending: any[] = [];

      leagerData.forEach((row, index) => {
        const [psnId, teamName, position] = row;

        if (!psnId || !teamName) {
          if (debug && index < 5) {
            console.log(`    SKIP row ${index}: missing psnId or teamName`);
          }
          return;
        }

        const normalized = normalizePsnId(psnId);
        const oldProfileId = oldProfileMap.get(normalized);
        if (!oldProfileId) {
          missingProfiles.add(psnId);
          return;
        }

        const teamKey = `${seasonCode}_${teamName.trim()}`;
        const teamData = teamMap.get(teamKey);
        if (!teamData) {
          missingTeams.add(teamKey);
          return;
        }

        pending.push({
          legacy_row_id: `${seasonCode}_leager:${index}`,
          season_id: seasonData.id,
          team_id: teamData.id,
          old_profile_id: oldProfileId,
          position: position ? position.trim() : null,
        });
      });

      if (pending.length === 0) {
        console.log(`    WARN: No valid roster entries found for ${seasonData.name}`);
        continue;
      }

      console.log(`    Inserting ${pending.length} roster entries...`);
      const rosterChunks = chunkArray(pending, 500);
      for (let i = 0; i < rosterChunks.length; i++) {
        const chunk = rosterChunks[i];
        const { error } = await supabase
          .from("old_team_rosters")
          .upsert(chunk, { onConflict: "legacy_row_id", ignoreDuplicates: true });

        if (error) {
          console.log(`    ERROR chunk ${i}: ${error.message}`);
          rosterErrors += chunk.length;
        } else {
          rosterCount += chunk.length;
        }
      }
      console.log(`    ${seasonData.name}: ${rosterCount} rosters inserted`);
    }

    if (missingProfiles.size > 0) {
      console.log(`\n  WARN: ${missingProfiles.size} roster entries skipped due to missing profiles (first 10):`);
      console.log(`  ${Array.from(missingProfiles).slice(0, 10).join(", ")}`);
    }
    if (missingTeams.size > 0) {
      console.log(`\n  WARN: ${missingTeams.size} roster entries skipped due to missing teams (first 10):`);
      console.log(`  ${Array.from(missingTeams).slice(0, 10).join(", ")}`);
    }

    console.log(`\nMigrated ${rosterCount} legacy roster rows (${rosterErrors} errors)`);
  } else {
    console.log("  SKIP rosters\n");
  }

  console.log("\n" + "=".repeat(60));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Seasons: ${seasonMap.size}`);
  console.log(`Teams: ${teamMap.size}`);
  console.log(`Matches: ${matchCount}${matchErrors > 0 ? ` (${matchErrors} errors)` : ""}`);
  console.log(`Stats: ${statsCount}${statsErrors > 0 ? ` (${statsErrors} errors)` : ""}${statsSkipped > 0 ? ` (${statsSkipped} skipped)` : ""}`);
  console.log(`Rosters: ${rosterCount}${rosterErrors > 0 ? ` (${rosterErrors} errors)` : ""}`);
  console.log("=".repeat(60));
  console.log("\nMigration complete!");
}

main().catch((err) => {
  console.error("\nMigration failed:", err);
  process.exit(1);
});
