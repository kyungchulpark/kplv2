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

const SYSTEM_PROMPT = `You are an expert at reading NBA 2K game result screenshots.
Extract player statistics from the screenshot and return them in the exact JSON format specified.

The screenshot shows a post-game stats screen with:
- Team scores at the top
- Left side: Home team players (5 players)
- Right side: Away team players (5 players)

For each player, extract:
- playerName: PSN ID / Gamertag (the player's name shown)
- pts: Points scored
- reb: Rebounds
- ast: Assists
- stl: Steals
- blk: Blocks
- fls: Fouls (sometimes shown as PF)
- turnovers: Turnovers (sometimes shown as TO)
- fgm: Field Goals Made
- fga: Field Goals Attempted
- three_pm: 3-Point Field Goals Made
- three_pa: 3-Point Field Goals Attempted
- ftm: Free Throws Made
- fta: Free Throws Attempted

IMPORTANT:
- If you can't read a value clearly, use 0
- Player names may contain special characters, numbers, underscores
- The format may vary but typically shows shooting stats as "Made/Attempted" (e.g., "5/10")
- Return exactly 5 players per team if visible

Return ONLY valid JSON, no markdown, no explanation.`;

const USER_PROMPT = `Extract the match statistics from this NBA 2K game result screenshot.

Return JSON in this exact format:
{
  "homeTeamScore": number,
  "awayTeamScore": number,
  "homeTeamPlayers": [
    {
      "playerName": "string",
      "pts": number,
      "reb": number,
      "ast": number,
      "stl": number,
      "blk": number,
      "fls": number,
      "turnovers": number,
      "fgm": number,
      "fga": number,
      "three_pm": number,
      "three_pa": number,
      "ftm": number,
      "fta": number
    }
  ],
  "awayTeamPlayers": [same format as homeTeamPlayers]
}`;

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
 * (Re-exported from original service for compatibility)
 */
export async function matchPlayersToRoster(
    ocrPlayers: OCRPlayerStats[],
    rosterPlayers: Array<{ player_id: string; psn_id: string }>
): Promise<Array<{ player_id: string; stats: OCRPlayerStats; confidence: number }>> {
    // Simple fuzzy matching - compare lowercased names
    return ocrPlayers.map((ocrPlayer) => {
        let bestMatch = rosterPlayers[0];
        let bestScore = 0;

        for (const rosterPlayer of rosterPlayers) {
            // Calculate similarity score
            const ocrName = ocrPlayer.playerName.toLowerCase().replace(/[^a-z0-9]/g, "");
            const rosterName = rosterPlayer.psn_id.toLowerCase().replace(/[^a-z0-9]/g, "");

            // Simple matching: check if one contains the other or calculate overlap
            let score = 0;
            if (ocrName === rosterName) {
                score = 100;
            } else if (ocrName.includes(rosterName) || rosterName.includes(ocrName)) {
                score = 80;
            } else {
                // Calculate character overlap
                const overlap = [...ocrName].filter(char => rosterName.includes(char)).length;
                score = Math.round((overlap / Math.max(ocrName.length, rosterName.length)) * 60);
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = rosterPlayer;
            }
        }

        return {
            player_id: bestMatch?.player_id || "",
            stats: ocrPlayer,
            confidence: bestScore / 100,
        };
    });
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
