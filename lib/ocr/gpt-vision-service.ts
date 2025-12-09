/**
 * GPT-4 Vision OCR Service
 *
 * NBA 2K 경기 결과 스크린샷에서 선수 스탯을 추출합니다.
 * Tesseract 대신 GPT-4o-mini Vision API를 사용하여 높은 정확도를 제공합니다.
 */

import OpenAI from "openai";

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

const SYSTEM_PROMPT = `You are an expert at reading NBA 2K25 Korean game result screenshots ("경기 기록" screen).

This is a Korean NBA 2K25 post-game stats screen with the title "경기 기록" (Game Record).

SCREEN LAYOUT:
- Top left: Home team logo and quarter scores (e.g., "20 13 14 14" = 61 total)
- Top right: Away team logo and quarter scores (e.g., "17 15 13 10" = 55 total)
- UPPER TABLE: Home team players (first team shown, with their team logo on left)
- LOWER TABLE: Away team players (second team shown, with their team logo on left)

TABLE STRUCTURE:
- Header row: 플레이어 (Player) | GRD | PTS | REB | AST | STL | BLK | FLS | TO | FGM/FGA | 3PM/3PA | FTM/FTA
- GRAY TEXT on the left of each table (before GRD column): This is the TEAM CAPTAIN name - IGNORE THIS
- BLACK TEXT rows: These are the ACTUAL PLAYER stats - EXTRACT THESE ONLY

CRITICAL: The first column shows player names in two different styles:
1. GRAY/FADED text = Team captain indicator (IGNORE)
2. BLACK/BOLD text = Actual player PSN ID (EXTRACT THIS)

EXTRACTION RULES:
1. Extract ONLY the rows with BLACK text - these are the 5 actual players per team
2. Player names are PSN IDs (e.g., "AustinR1vers", "ZazaWell", "NotEnoughRaf")
3. FGM/FGA format: "9/12" means fgm=9, fga=12
4. 3PM/3PA format: "0/3" means three_pm=0, three_pa=3
5. FTM/FTA format: "4/4" means ftm=4, fta=4
6. FLS column = fouls, TO column = turnovers
7. The "합계" (total) row with yellow background should be IGNORED
8. Extract players in the EXACT ORDER they appear in the table (top to bottom)
9. Each table has exactly 5 player rows with black text

IMPORTANT: Read each row carefully from top to bottom. Maintain the exact order.

Return ONLY valid JSON with no markdown formatting.`;

const USER_PROMPT = `Extract all player statistics from this NBA 2K25 Korean game result screenshot.

The upper table shows HOME team players.
The lower table shows AWAY team players.

Return JSON in this EXACT format:
{
  "homeTeamScore": 61,
  "awayTeamScore": 55,
  "homeTeamPlayers": [
    {
      "playerName": "AustinR1vers",
      "pts": 22,
      "reb": 1,
      "ast": 8,
      "stl": 0,
      "blk": 0,
      "fls": 3,
      "turnovers": 4,
      "fgm": 9,
      "fga": 12,
      "three_pm": 0,
      "three_pa": 3,
      "ftm": 4,
      "fta": 4
    }
  ],
  "awayTeamPlayers": [
    {
      "playerName": "NotEnoughRaf",
      "pts": 8,
      "reb": 0,
      "ast": 14,
      "stl": 0,
      "blk": 0,
      "fls": 1,
      "turnovers": 1,
      "fgm": 3,
      "fga": 11,
      "three_pm": 2,
      "three_pa": 8,
      "ftm": 0,
      "fta": 0
    }
  ]
}

Extract ALL 5 players from each team. Do NOT include the 합계 (total) row.`;

/**
 * Convert File to base64 data URL
 */
async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Extract match stats from NBA 2K screenshot using GPT-4 Vision
 *
 * @param imageFile - Screenshot file to process
 * @param progressCallback - Optional callback to report progress (0-100)
 * @returns OCR match result with player stats
 */
export async function extractStatsFromScreenshot(
    imageFile: File,
    progressCallback?: (progress: number) => void
): Promise<OCRMatchResult> {
    // Initialize progress
    progressCallback?.(10);

    // Check for API key
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OpenAI API key not configured. Please set NEXT_PUBLIC_OPENAI_API_KEY in .env.local");
    }

    const openai = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true, // Required for client-side usage
    });

    progressCallback?.(20);

    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);

    progressCallback?.(30);

    try {
        // Call GPT-4 Vision API
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT,
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: USER_PROMPT,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: base64Image,
                                detail: "high",
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
            temperature: 0.1, // Low temperature for consistent output
        });

        progressCallback?.(80);

        // Parse the response
        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from GPT-4 Vision");
        }

        // Clean up JSON (remove markdown code blocks if present)
        let jsonStr = content.trim();
        if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.slice(7);
        }
        if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.slice(3);
        }
        if (jsonStr.endsWith("```")) {
            jsonStr = jsonStr.slice(0, -3);
        }
        jsonStr = jsonStr.trim();

        const result = JSON.parse(jsonStr);

        progressCallback?.(100);

        return {
            homeTeamScore: result.homeTeamScore || 0,
            awayTeamScore: result.awayTeamScore || 0,
            homeTeamPlayers: result.homeTeamPlayers || [],
            awayTeamPlayers: result.awayTeamPlayers || [],
            rawText: content,
            confidence: 0.95, // GPT-4 Vision is generally very accurate
        };
    } catch (error) {
        console.error("GPT-4 Vision OCR error:", error);

        // Return empty result on error
        return {
            homeTeamScore: 0,
            awayTeamScore: 0,
            homeTeamPlayers: [],
            awayTeamPlayers: [],
            rawText: error instanceof Error ? error.message : "Unknown error",
            confidence: 0,
        };
    }
}

/**
 * Match OCR player names to database player IDs using fuzzy matching
 * IMPORTANT: Prevents duplicate matching - each roster player can only be matched once
 */
export async function matchPlayersToRoster(
    ocrPlayers: OCRPlayerStats[],
    rosterPlayers: Array<{ player_id: string; psn_id: string }>
): Promise<Array<{ player_id: string; stats: OCRPlayerStats; confidence: number }>> {
    // Track which roster players have already been matched
    const usedPlayerIds = new Set<string>();
    const results: Array<{ player_id: string; stats: OCRPlayerStats; confidence: number }> = [];

    for (const ocrPlayer of ocrPlayers) {
        let bestMatch: { player_id: string; psn_id: string } | null = null;
        let bestScore = 0;

        // Only consider roster players that haven't been used yet
        const availablePlayers = rosterPlayers.filter(p => !usedPlayerIds.has(p.player_id));

        for (const rosterPlayer of availablePlayers) {
            // Calculate similarity score
            const ocrName = ocrPlayer.playerName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const rosterName = rosterPlayer.psn_id.toLowerCase().replace(/[^a-z0-9]/g, "");

            let score = 0;
            if (ocrName === rosterName) {
                score = 100;
            } else if (ocrName.includes(rosterName) || rosterName.includes(ocrName)) {
                score = 80;
            } else {
                // Calculate character overlap using Levenshtein-like approach
                const minLen = Math.min(ocrName.length, rosterName.length);
                const maxLen = Math.max(ocrName.length, rosterName.length);
                let matches = 0;

                // Check consecutive matching characters
                for (let i = 0; i < minLen; i++) {
                    if (ocrName[i] === rosterName[i]) {
                        matches++;
                    }
                }

                // Also check if characters exist anywhere
                const overlap = [...ocrName].filter(char => rosterName.includes(char)).length;
                score = Math.round(((matches / maxLen) * 40) + ((overlap / maxLen) * 20));
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = rosterPlayer;
            }
        }

        // Mark this player as used to prevent duplicates
        if (bestMatch) {
            usedPlayerIds.add(bestMatch.player_id);
        }

        results.push({
            player_id: bestMatch?.player_id || "",
            stats: ocrPlayer,
            confidence: bestScore / 100,
        });
    }

    return results;
}

/**
 * Validate OCR player stats
 * Check if stats make sense (FGM <= FGA, etc.)
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

    return errors;
}
