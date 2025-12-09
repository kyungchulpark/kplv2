import Tesseract from "tesseract.js";
// @ts-ignore - fuzzball doesn't have type definitions
import * as fuzz from "fuzzball";

export interface OCRPlayerStats {
  playerName: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fls: number;
  turnovers: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
}

export interface OCRMatchResult {
  homeTeamScore: number;
  awayTeamScore: number;
  homeTeamPlayers: OCRPlayerStats[];
  awayTeamPlayers: OCRPlayerStats[];
  rawText: string;
  confidence: number;
}

/**
 * Extract match stats from NBA 2K screenshot using Tesseract OCR
 * Supports: Korean, English, Japanese, Chinese
 *
 * @param imageFile - Screenshot file to process
 * @param progressCallback - Optional callback to report progress (0-100)
 * @returns OCR match result with player stats
 */
export async function extractStatsFromScreenshot(
  imageFile: File,
  progressCallback?: (progress: number) => void
): Promise<OCRMatchResult> {
  // Initialize Tesseract with multi-language support
  const worker = await Tesseract.createWorker("kor+eng+jpn+chi_sim", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && progressCallback) {
        progressCallback(Math.round(m.progress * 100));
      }
    },
  });

  try {
    // Perform OCR
    const {
      data: { text, confidence },
    } = await worker.recognize(imageFile);

    // Parse the text to extract stats
    const result = parseGameResultText(text);

    return {
      ...result,
      rawText: text,
      confidence: confidence / 100, // Normalize to 0-1
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Parse raw OCR text into structured match data
 *
 * NBA 2K screenshot structure:
 * - Top: Team scores (large numbers)
 * - Left side: Home team (5 players + stats)
 * - Right side: Away team (5 players + stats)
 * - Stats columns: PTS, REB, AST, STL, BLK, FLS, TO, FG M/A, 3P M/A, FT M/A
 *
 * @param text - Raw OCR text
 * @returns Parsed match result without rawText and confidence
 */
function parseGameResultText(
  text: string
): Omit<OCRMatchResult, "rawText" | "confidence"> {
  const lines = text.split("\n").filter((line) => line.trim().length > 0);

  // Extract team scores (look for pattern like "55  75" or "55 - 75")
  let homeTeamScore = 0;
  let awayTeamScore = 0;

  for (const line of lines.slice(0, 10)) {
    // Check first 10 lines
    const scoreMatch = line.match(/(\d{2,3})\s*[-:vs]?\s*(\d{2,3})/i);
    if (scoreMatch) {
      homeTeamScore = parseInt(scoreMatch[1]);
      awayTeamScore = parseInt(scoreMatch[2]);
      break;
    }
  }

  // Extract player stats
  // This is a placeholder implementation - needs customization based on actual screenshot format
  const homeTeamPlayers: OCRPlayerStats[] = [];
  const awayTeamPlayers: OCRPlayerStats[] = [];

  // Pattern to match player stats line:
  // PlayerName | PTS | REB | AST | STL | BLK | FLS | TO | FG M/A | 3P M/A | FT M/A
  // Example: "HWASHIN 4 2 0 0 0 3 0 2/2 0/0 0/0"
  const statsPattern =
    /([A-Za-z가-힣ぁ-んァ-ヶー一-龯0-9_]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\/(\d+)\s+(\d+)\/(\d+)\s+(\d+)\/(\d+)/;

  let currentTeam: "home" | "away" | null = null;
  let homeCount = 0;
  let awayCount = 0;

  for (const line of lines) {
    const match = line.match(statsPattern);
    if (match) {
      const playerStats: OCRPlayerStats = {
        playerName: match[1],
        pts: parseInt(match[2]),
        reb: parseInt(match[3]),
        ast: parseInt(match[4]),
        stl: parseInt(match[5]),
        blk: parseInt(match[6]),
        fls: parseInt(match[7]),
        turnovers: parseInt(match[8]),
        fgm: parseInt(match[9]),
        fga: parseInt(match[10]),
        three_pm: parseInt(match[11]),
        three_pa: parseInt(match[12]),
        ftm: parseInt(match[13]),
        fta: parseInt(match[14]),
      };

      // Determine which team this player belongs to
      // Simple heuristic: first 5 players are home team, next 5 are away team
      if (homeCount < 5) {
        homeTeamPlayers.push(playerStats);
        homeCount++;
      } else if (awayCount < 5) {
        awayTeamPlayers.push(playerStats);
        awayCount++;
      }

      if (homeCount === 5 && awayCount === 5) {
        break; // All players found
      }
    }
  }

  return {
    homeTeamScore,
    awayTeamScore,
    homeTeamPlayers,
    awayTeamPlayers,
  };
}

/**
 * Match OCR player names to database player IDs using fuzzy matching
 *
 * @param ocrPlayers - Players extracted from OCR
 * @param rosterPlayers - Team roster from database
 * @returns Matched players with confidence scores
 */
export async function matchPlayersToRoster(
  ocrPlayers: OCRPlayerStats[],
  rosterPlayers: Array<{ player_id: string; psn_id: string }>
): Promise<
  Array<{ player_id: string; stats: OCRPlayerStats; confidence: number }>
> {
  return ocrPlayers.map((ocrPlayer) => {
    // Find best match in roster using fuzzy string matching
    let bestMatch = rosterPlayers[0];
    let bestScore = 0;

    for (const rosterPlayer of rosterPlayers) {
      // Use fuzzball to calculate similarity
      const score = fuzz.ratio(
        ocrPlayer.playerName.toLowerCase(),
        rosterPlayer.psn_id.toLowerCase()
      );

      if (score > bestScore) {
        bestScore = score;
        bestMatch = rosterPlayer;
      }
    }

    return {
      player_id: bestMatch?.player_id || "",
      stats: ocrPlayer,
      confidence: bestScore / 100, // Normalize to 0-1
    };
  });
}

/**
 * Validate OCR player stats
 * Check if stats make sense (FGM <= FGA, etc.)
 *
 * @param stats - Player stats to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validatePlayerStats(stats: OCRPlayerStats): string[] {
  const errors: string[] = [];

  if (stats.fgm > stats.fga) {
    errors.push(`FGM (${stats.fgm}) > FGA (${stats.fga})`);
  }

  if (stats.three_pm > stats.three_pa) {
    errors.push(`3PM (${stats.three_pm}) > 3PA (${stats.three_pa})`);
  }

  if (stats.ftm > stats.fta) {
    errors.push(`FTM (${stats.ftm}) > FTA (${stats.fta})`);
  }

  if (stats.three_pm > stats.fgm) {
    errors.push(`3PM (${stats.three_pm}) > FGM (${stats.fgm})`);
  }

  // Calculate expected points: (FGM - 3PM) * 2 + 3PM * 3 + FTM
  const expectedPoints =
    (stats.fgm - stats.three_pm) * 2 + stats.three_pm * 3 + stats.ftm;
  if (stats.pts !== expectedPoints) {
    errors.push(
      `Points mismatch: ${stats.pts} vs expected ${expectedPoints}`
    );
  }

  return errors;
}
