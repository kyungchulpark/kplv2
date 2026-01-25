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

// Season codes
const SEASON_CODES = [
  "2020_1st", "2021_2nd", "2021_3rd", "2021_4th",
  "2022_1st", "2022_2nd", "2022_3rd",
  "2023_1st", "2023_2nd", "2023_3rd",
  "2024_1st", "2024_2nd", "2024_3rd", "2024_4th",
  "2025_1st", "2025_2nd", "2025_3nd",
  "current"
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

// Create legacy profile for unmapped players
// IMPORTANT: Only creates new profile if PSN ID doesn't exist (case-insensitive)
// New profiles are marked as is_legacy=true, is_active=false to prevent cluttering admin UI
async function createLegacyProfile(
  psnId: string,
  existingProfiles: Map<string, string>
): Promise<string | null> {
  try {
    const normalizedPsnId = psnId.toLowerCase().trim();

    // Double-check against existing profiles map (case-insensitive)
    if (existingProfiles.has(normalizedPsnId)) {
      return existingProfiles.get(normalizedPsnId)!;
    }

    // Final DB check with ilike for case-insensitive match
    const { data: existing } = await supabase
      .from("profiles")
      .select("id, psn_id")
      .ilike("psn_id", psnId.trim())
      .maybeSingle();

    if (existing) {
      // Found existing profile - update our map and return it
      existingProfiles.set(normalizedPsnId, existing.id);
      console.log(`       ℹ️ 기존 프로필 발견: ${existing.psn_id} → ${psnId}`);
      return existing.id;
    }

    // Create new legacy profile (inactive by default)
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        psn_id: psnId.trim(),
        is_legacy: true,
        is_active: false, // Hide from active user management
        role: "player",
      })
      .select("id")
      .single();

    if (error) throw error;

    // Update our map
    existingProfiles.set(normalizedPsnId, data.id);

    return data.id;
  } catch (err) {
    console.error(`       ✗ 레거시 프로필 생성 실패 (${psnId}):`, err);
    return null;
  }
}

async function main() {
  console.log("🚀 매치 & 스탯 전용 마이그레이션 시작\n");
  console.log("=".repeat(60));

  // Read SQL file
  const sqlPath = path.join(__dirname, "../supabase/kpl_all.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL 파일을 찾을 수 없습니다: ${sqlPath}`);
    process.exit(1);
  }

  console.log(`📂 SQL 파일 읽는 중: ${sqlPath}`);
  const sqlContent = fs.readFileSync(sqlPath, "utf-8");
  console.log(`✓ SQL 파일 로드 완료 (${(sqlContent.length / 1024 / 1024).toFixed(2)} MB)\n`);

  // Load existing seasons from DB
  console.log("=".repeat(60));
  console.log("[1/4] 🏆 기존 시즌 정보 로드");
  console.log("=".repeat(60));

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, start_date");

  if (!seasons || seasons.length === 0) {
    console.error("❌ 시즌 데이터가 없습니다. 먼저 전체 마이그레이션을 실행하세요.");
    process.exit(1);
  }

  const seasonMap = new Map<string, { id: string; name: string }>();

  // Map season codes to season IDs
  const seasonNameToCode = new Map<string, string>();
  seasonNameToCode.set("2020 Season 1st", "2020_1st");
  seasonNameToCode.set("2021 Season 2nd", "2021_2nd");
  seasonNameToCode.set("2021 Season 3rd", "2021_3rd");
  seasonNameToCode.set("2021 Season 4th", "2021_4th");
  seasonNameToCode.set("2022 Season 1st", "2022_1st");
  seasonNameToCode.set("2022 Season 2nd", "2022_2nd");
  seasonNameToCode.set("2022 Season 3rd", "2022_3rd");
  seasonNameToCode.set("2023 Season 1st", "2023_1st");
  seasonNameToCode.set("2023 Season 2nd", "2023_2nd");
  seasonNameToCode.set("2023 Season 3rd", "2023_3rd");
  seasonNameToCode.set("2024 Season 1st", "2024_1st");
  seasonNameToCode.set("2024 Season 2nd", "2024_2nd");
  seasonNameToCode.set("2024 Season 3rd", "2024_3rd");
  seasonNameToCode.set("2024 Season 4th", "2024_4th");
  seasonNameToCode.set("2025 Season 1st", "2025_1st");
  seasonNameToCode.set("2025 Season 2nd", "2025_2nd");
  seasonNameToCode.set("2025 Season 3rd", "2025_3nd");
  seasonNameToCode.set("2026 Season 1st", "current");

  seasons.forEach((s) => {
    const code = seasonNameToCode.get(s.name);
    if (code) {
      seasonMap.set(code, { id: s.id, name: s.name });
      console.log(`  ✓ ${s.name} (${code})`);
    }
  });

  console.log(`\n📊 로드된 시즌: ${seasonMap.size}개\n`);

  // Load existing teams from DB
  console.log("=".repeat(60));
  console.log("[2/4] 🏀 기존 팀 정보 로드");
  console.log("=".repeat(60));

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, season_id");

  if (!teams || teams.length === 0) {
    console.error("❌ 팀 데이터가 없습니다. 먼저 전체 마이그레이션을 실행하세요.");
    process.exit(1);
  }

  const teamMap = new Map<string, { id: string; name: string }>();

  teams.forEach((team) => {
    // Find season code for this team's season_id
    const seasonEntry = Array.from(seasonMap.entries()).find(
      ([_, data]) => data.id === team.season_id
    );
    if (seasonEntry) {
      const [seasonCode] = seasonEntry;
      teamMap.set(`${seasonCode}_${team.name}`, { id: team.id, name: team.name });
    }
  });

  console.log(`  ✓ 로드된 팀: ${teamMap.size}개\n`);

  // Build player mappings
  console.log("=".repeat(60));
  console.log("[3/4] 👥 플레이어 매핑 구축");
  console.log("=".repeat(60));

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

  console.log(`  ✓ 매핑된 PSN ID: ${playerMap.size}개\n`);

  // Migrate Matches & Stats
  console.log("=".repeat(60));
  console.log("[4/4] 🎮 매치 & 스탯 마이그레이션");
  console.log("=".repeat(60));

  let matchCount = 0;
  let statsCount = 0;
  let legacyProfilesCreated = 0;
  let unmappedPlayers = new Set<string>();

  for (const [seasonCode, seasonData] of seasonMap) {
    console.log(`\n  📅 ${seasonData.name}`);

    // Parse matches
    const matchData = parseSqlInserts(sqlContent, `${seasonCode}_match`);
    const statsData = parseSqlInserts(sqlContent, `${seasonCode}_stats`);

    if (matchData.length === 0) {
      console.log(`     ⚠️ 매치 데이터 없음`);
      continue;
    }

    console.log(`     → 매치: ${matchData.length}개, 스탯: ${statsData.length}개 발견`);

    // Import matches
    let seasonMatches = 0;
    for (const row of matchData) {
      const [dateTime, homeTeam, awayTeam, homePts, awayPts] = row;

      if (!homeTeam || !awayTeam || !homeTeam.trim() || !awayTeam.trim()) {
        continue; // Skip empty team names
      }

      const homeTeamData = teamMap.get(`${seasonCode}_${homeTeam.trim()}`);
      const awayTeamData = teamMap.get(`${seasonCode}_${awayTeam.trim()}`);

      if (!homeTeamData || !awayTeamData) {
        continue;
      }

      try {
        const { error } = await supabase.from("matches").upsert({
          season_id: seasonData.id,
          home_team_id: homeTeamData.id,
          away_team_id: awayTeamData.id,
          home_score: parseInt(homePts) || 0,
          away_score: parseInt(awayPts) || 0,
          match_date: dateTime || new Date().toISOString(),
          status: "finished",
        }, {
          onConflict: "season_id,home_team_id,away_team_id,match_date",
          ignoreDuplicates: true,
        });

        if (!error) {
          matchCount++;
          seasonMatches++;
        }
      } catch (err) {
        // Skip duplicates silently
      }
    }

    console.log(`     ✓ 매치 임포트: ${seasonMatches}개`);

    // Import stats
    if (statsData.length === 0) {
      console.log(`     ⚠️ 스탯 데이터 없음`);
      continue;
    }

    // Get all matches for this season
    const { data: matches } = await supabase
      .from("matches")
      .select("id, home_team_id, away_team_id, match_date")
      .eq("season_id", seasonData.id);

    if (!matches || matches.length === 0) {
      console.log(`     ⚠️ 매치가 없어서 스탯을 임포트할 수 없음`);
      continue;
    }

    let seasonStats = 0;
    let seasonLegacyProfiles = 0;

    for (const row of statsData) {
      // 수정: matchId 제거! stats 테이블에는 matchId가 없음
      const [psnId, vs, pts, reb, ast, stl, blk, fls, to, fgm, fga, tpm, tpa] = row;

      if (!psnId || !vs || !psnId.trim() || !vs.trim()) {
        continue; // Skip invalid data
      }

      // Check if player exists, if not create legacy profile
      let playerId: string | undefined | null = playerMap.get(psnId.toLowerCase().trim());

      if (!playerId) {
        // Create legacy profile for this player
        const newPlayerId = await createLegacyProfile(psnId.trim(), playerMap);

        if (newPlayerId) {
          playerId = newPlayerId;
          legacyProfilesCreated++;
          seasonLegacyProfiles++;
        } else {
          unmappedPlayers.add(psnId);
          continue;
        }
      }

      const vsTeamData = teamMap.get(`${seasonCode}_${vs.trim()}`);
      if (!vsTeamData) continue;

      // Find matching match (player's opponent is vs team)
      const match = matches.find(
        (m) => m.home_team_id === vsTeamData.id || m.away_team_id === vsTeamData.id
      );

      if (!match) continue;

      try {
        await supabase.from("match_stats").insert({
          match_id: match.id,
          player_id: playerId,
          psn_id: psnId.trim(),
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
        seasonStats++;
      } catch (err) {
        // Skip duplicates
      }
    }

    console.log(`     ✓ 스탯 임포트: ${seasonStats}개`);
    if (seasonLegacyProfiles > 0) {
      console.log(`     ✓ 레거시 프로필 생성: ${seasonLegacyProfiles}개`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ 매치 & 스탯 마이그레이션 완료!");
  console.log("=".repeat(60));
  console.log(`\n📊 결과:`);
  console.log(`  • 임포트된 매치: ${matchCount}개`);
  console.log(`  • 임포트된 스탯: ${statsCount}개`);
  console.log(`  • 생성된 레거시 프로필: ${legacyProfilesCreated}개`);
  console.log(`  • 실패한 플레이어: ${unmappedPlayers.size}명`);

  if (legacyProfilesCreated > 0) {
    console.log(`\n💡 레거시 프로필은 is_legacy=true로 표시되어 숨김 처리 가능합니다.`);
    console.log(`   실제 유저가 가입 후 PSN ID 히스토리에 추가하면 자동으로 연결됩니다.\n`);
  }
}

main().catch((err) => {
  console.error("\n❌ 마이그레이션 실패:", err);
  process.exit(1);
});
