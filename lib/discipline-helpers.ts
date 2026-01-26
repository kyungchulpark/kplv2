import { createClient } from "@/utils/supabase/server";

export interface PlayerDiscipline {
  id: string;
  player_id: string;
  season_id: string;
  games_suspended: number;
  games_remaining: number;
  reason: string;
  applied_by: string | null;
  applied_at: string;
  completed_at: string | null;
  is_active: boolean;
}

export interface PlayerDisciplineWithPlayer extends PlayerDiscipline {
  player: {
    id: string;
    psn_id: string;
    email: string;
  };
}

/**
 * Check if a player is currently suspended
 *
 * @param playerId - Player ID to check
 * @param seasonId - Season ID
 * @returns True if player has an active suspension
 */
export async function isPlayerSuspended(
  playerId: string,
  seasonId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: discipline } = await supabase
    .from("player_disciplines")
    .select("id")
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .gt("games_remaining", 0)
    .maybeSingle();

  return !!discipline;
}

/**
 * Get a player's active discipline record
 *
 * @param playerId - Player ID
 * @param seasonId - Season ID
 * @returns Active discipline record or null
 */
export async function getPlayerDiscipline(
  playerId: string,
  seasonId: string
): Promise<PlayerDiscipline | null> {
  const supabase = await createClient();

  const { data: discipline, error } = await supabase
    .from("player_disciplines")
    .select("*")
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .gt("games_remaining", 0)
    .maybeSingle();

  if (error) {
    console.error("Error fetching player discipline:", error);
    return null;
  }

  return discipline;
}

/**
 * Get a player's full discipline history
 *
 * @param playerId - Player ID
 * @param seasonId - Optional season ID to filter by
 * @returns Array of discipline records
 */
export async function getPlayerDisciplineHistory(
  playerId: string,
  seasonId?: string
): Promise<PlayerDisciplineWithPlayer[]> {
  const supabase = await createClient();

  let query = supabase
    .from("player_disciplines")
    .select(`
      *,
      player:profiles!player_disciplines_player_id_fkey(id, psn_id, email)
    `)
    .eq("player_id", playerId)
    .order("applied_at", { ascending: false });

  if (seasonId) {
    query = query.eq("season_id", seasonId);
  }

  const { data: disciplines, error } = await query;

  if (error) {
    console.error("Error fetching discipline history:", error);
    return [];
  }

  return disciplines || [];
}

/**
 * Get all active disciplines for a season
 *
 * @param seasonId - Season ID
 * @returns Array of active discipline records with player info
 */
export async function getActiveDisciplines(
  seasonId: string
): Promise<PlayerDisciplineWithPlayer[]> {
  const supabase = await createClient();

  const { data: disciplines, error } = await supabase
    .from("player_disciplines")
    .select(`
      *,
      player:profiles!player_disciplines_player_id_fkey(id, psn_id, email)
    `)
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .gt("games_remaining", 0)
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Error fetching active disciplines:", error);
    return [];
  }

  return disciplines || [];
}

/**
 * Get all disciplines (active and completed) for a season
 *
 * @param seasonId - Season ID
 * @returns Array of all discipline records with player info
 */
export async function getAllDisciplines(
  seasonId: string
): Promise<PlayerDisciplineWithPlayer[]> {
  const supabase = await createClient();

  const { data: disciplines, error } = await supabase
    .from("player_disciplines")
    .select(`
      *,
      player:profiles!player_disciplines_player_id_fkey(id, psn_id, email)
    `)
    .eq("season_id", seasonId)
    .order("is_active", { ascending: false })
    .order("applied_at", { ascending: false });

  if (error) {
    console.error("Error fetching all disciplines:", error);
    return [];
  }

  return disciplines || [];
}
