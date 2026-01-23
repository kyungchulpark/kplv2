import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

// Load environment variables
config({ path: path.join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing Supabase credentials in .env.local");
  console.error("   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
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

// Parse SQL INSERT statements
function parseSqlInserts(sqlContent: string, tableName: string): string[][] {
  const pattern = new RegExp(
    `INSERT INTO \`${tableName}\`\\s*\\([^)]+\\)\\s*VALUES\\s*([^;]+);`,
    "gis"
  );
  const matches = [...sqlContent.matchAll(pattern)];

  if (matches.length === 0) return [];

  const allRows: string[][] = [];

  matches.forEach((match) => {
    const valuesSection = match[1];
    const rowPattern = /\(([^)]+(?:\([^)]*\)[^)]*)*)\)/g;
    const rows = [...valuesSection.matchAll(rowPattern)];

    rows.forEach((row) => {
      const values = parseRowValues(row[1]);
      allRows.push(values);
    });
  });

  return allRows;
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

async function main() {
  console.log("🚀 Starting KPL Legacy Data Migration\n");
  console.log("=" .repeat(60));

  // Read SQL file
  const sqlPath = path.join(__dirname, "../supabase/kpl_all.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  console.log(`📂 Reading SQL file: ${sqlPath}`);
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");
  console.log(`✓ SQL file loaded (${(sqlContent.length / 1024 / 1024).toFixed(2)} MB)\n`);

  // Step 1: Create Seasons
  console.log("=" .repeat(60));
  console.log("[1/5] 🏆 Creating Seasons");
  console.log("=" .repeat(60));

  const seasonMap = new Map<string, { id: string; name: string }>();

  for (const season of SEASONS) {
    try {
      const { data, error } = await supabase
        .from("seasons")
        .upsert({
          name: season.name,
          start_date: season.start,
          end_date: season.end,
          is_active: season.code === "current",
        }, {
          onConflict: "name",
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (error) throw error;

      seasonMap.set(season.code, { id: data.id, name: data.name });
      console.log(`  ✓ ${season.name}`);
    } catch (err: any) {
      console.error(`  ✗ ${season.name}: ${err.message}`);
    }
  }
  console.log(`\n📊 Created ${seasonMap.size}/${SEASONS.length} seasons\n`);

  // Step 2: Build Player Mappings
  console.log("=" .repeat(60));
  console.log("[2/5] 👥 Building Player Mappings");
  console.log("=" .repeat(60));

  const { data: profiles } = await supabase.from("profiles").select("id, psn_id");
  const { data: psnHistory } = await supabase
    .from("psn_id_history")
    .select("user_id, old_psn_id, new_psn_id");

  const playerMap = new Map<string, string>();

  profiles?.forEach((p) => {
    playerMap.set(p.psn_id.toLowerCase().trim(), p.id);
  });

  psnHistory?.forEach((h) => {
    playerMap.set(h.old_psn_id.toLowerCase().trim(), h.user_id);
    playerMap.set(h.new_psn_id.toLowerCase().trim(), h.user_id);
  });

  console.log(`  ✓ Mapped ${playerMap.size} PSN IDs to user accounts\n`);

  // Step 3: Migrate Teams
  console.log("=" .repeat(60));
  console.log("[3/5] 🏀 Migrating Teams");
  console.log("=" .repeat(60));

  const teamMap = new Map<string, { id: string; name: string }>();

  for (const [seasonCode, seasonData] of seasonMap) {
    const matchData = parseSqlInserts(sqlContent, `${seasonCode}_match`);

    if (matchData.length === 0) {
      console.log(`  ⚠ No matches for ${seasonCode}`);
      continue;
    }

    const teamNames = new Set<string>();
    matchData.forEach((row) => {
      if (row[1]) teamNames.add(row[1].trim()); // home
      if (row[2]) teamNames.add(row[2].trim()); // away
    });

    console.log(`  → ${seasonData.name}: ${teamNames.size} teams`);

    for (const teamName of teamNames) {
      try {
        const { data, error } = await supabase
          .from("teams")
          .upsert({
            name: teamName,
            season_id: seasonData.id,
            conference: null,
            captain_id: null,
            is_active: seasonCode === "current",
            wins: 0,
            losses: 0,
            points_for: 0,
            points_against: 0,
          }, {
            onConflict: "name,season_id",
            ignoreDuplicates: false,
          })
          .select()
          .single();

        if (error) throw error;

        teamMap.set(`${seasonCode}_${teamName}`, { id: data.id, name: teamName });
      } catch (err: any) {
        console.error(`    ✗ ${teamName}: ${err.message}`);
      }
    }
  }
  console.log(`\n📊 Migrated ${teamMap.size} teams\n`);

  // Step 4: Migrate Matches
  console.log("=" .repeat(60));
  console.log("[4/5] 🎮 Migrating Matches");
  console.log("=" .repeat(60));

  let matchCount = 0;

  for (const [seasonCode, seasonData] of seasonMap) {
    const matchData = parseSqlInserts(sqlContent, `${seasonCode}_match`);

    if (matchData.length === 0) continue;

    console.log(`  → ${seasonData.name}: ${matchData.length} matches`);

    for (const row of matchData) {
      const [dateTime, homeTeam, awayTeam, homePts, awayPts] = row;

      const homeTeamData = teamMap.get(`${seasonCode}_${homeTeam?.trim()}`);
      const awayTeamData = teamMap.get(`${seasonCode}_${awayTeam?.trim()}`);

      if (!homeTeamData || !awayTeamData) continue;

      try {
        const { error } = await supabase.from("matches").upsert({
          season_id: seasonData.id,
          home_team_id: homeTeamData.id,
          away_team_id: awayTeamData.id,
          home_score: parseInt(homePts) || 0,
          away_score: parseInt(awayPts) || 0,
          match_date: dateTime || new Date().toISOString(),
          status: "completed",
        }, {
          onConflict: "season_id,home_team_id,away_team_id,match_date",
          ignoreDuplicates: true,
        });

        if (!error) matchCount++;
      } catch (err) {
        // Skip duplicates silently
      }
    }
  }
  console.log(`\n📊 Migrated ${matchCount} matches\n`);

  // Step 5: Migrate Stats
  console.log("=" .repeat(60));
  console.log("[5/5] 📈 Migrating Player Stats");
  console.log("=" .repeat(60));

  let statsCount = 0;
  let unmappedPlayers = new Set<string>();

  for (const [seasonCode, seasonData] of seasonMap) {
    const statsData = parseSqlInserts(sqlContent, `${seasonCode}_stats`);

    if (statsData.length === 0) continue;

    console.log(`  → ${seasonData.name}: ${statsData.length} stat entries`);

    // Get all matches for this season
    const { data: matches } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id")
      .eq("season_id", seasonData.id);

    if (!matches) continue;

    for (const row of statsData) {
      const [matchId, psnId, vs, pts, reb, ast, stl, blk, fls, to, fgm, fga, tpm, tpa] = row;

      const playerId = playerMap.get(psnId?.toLowerCase().trim());
      if (!playerId) {
        unmappedPlayers.add(psnId);
      }

      const vsTeamData = teamMap.get(`${seasonCode}_${vs?.trim()}`);
      if (!vsTeamData) continue;

      // Find matching match (player's opponent is vs team)
      const match = matches.find(
        (m) => m.home_team_id === vsTeamData.id || m.away_team_id === vsTeamData.id
      );

      if (!match) continue;

      try {
        await supabase.from("match_stats").insert({
          match_id: match.id,
          player_id: playerId || null,
          team_id: match.home_team_id === vsTeamData.id ? match.away_team_id : match.home_team_id,
          pts: parseInt(pts) || 0,
          reb: parseInt(reb) || 0,
          ast: parseInt(ast) || 0,
          stl: parseInt(stl) || 0,
          blk: parseInt(blk) || 0,
          fls: parseInt(fls) || 0,
          to: parseInt(to) || 0,
          fgm: parseInt(fgm) || 0,
          fga: parseInt(fga) || 0,
          tpm: parseInt(tpm) || 0,
          tpa: parseInt(tpa) || 0,
        });

        statsCount++;
      } catch (err) {
        // Skip duplicates
      }
    }
  }

  console.log(`\n📊 Migrated ${statsCount} stat entries`);
  console.log(`⚠️  ${unmappedPlayers.size} unique players not mapped to accounts\n`);

  console.log("=" .repeat(60));
  console.log("✅ Migration Complete!");
  console.log("=" .repeat(60));
  console.log(`\n📊 Summary:`);
  console.log(`  • Seasons: ${seasonMap.size}`);
  console.log(`  • Teams: ${teamMap.size}`);
  console.log(`  • Matches: ${matchCount}`);
  console.log(`  • Stats: ${statsCount}`);
  console.log(`  • Player mappings: ${playerMap.size}`);
  console.log(`  • Unmapped players: ${unmappedPlayers.size}`);

  if (unmappedPlayers.size > 0) {
    console.log(`\n💡 Tip: Users can add their previous PSN IDs in Profile → PSN ID History`);
    console.log(`   to link their historical stats.\n`);
  }
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err);
  process.exit(1);
});
