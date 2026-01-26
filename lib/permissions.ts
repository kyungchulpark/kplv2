import { createClient } from "@/utils/supabase/server";

interface PermissionResult {
  canUpload: boolean;
  teamId: string | null;
  reason: string;
}

interface TeamRole {
  id: string;
  team_id: string;
  player_id: string;
  season_id: string;
  role: string;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  is_active: boolean;
}

/**
 * Check if current user can upload results for this match
 *
 * Permission Logic:
 * 1. Admin/Staff can always upload
 * 2. Team members (players in team_rosters) can upload for their team's matches
 * 3. Match must not be already finished
 *
 * @param userId - Current user ID
 * @param matchId - Match ID to check
 * @param seasonId - Season ID for the match
 * @returns Permission result with canUpload flag, teamId, and reason
 */
export async function canUserUploadMatchResult(
  userId: string,
  matchId: string,
  seasonId: string
): Promise<PermissionResult> {
  const supabase = await createClient();

  // 1. Check if user is admin or staff (they can always upload)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile && ["admin", "staff"].includes(profile.role)) {
    return {
      canUpload: true,
      teamId: null,
      reason: "Admin/Staff access",
    };
  }

  // 2. Get match details
  const { data: match } = await supabase
    .from("matches")
    .select("home_team_id, away_team_id, home_score, away_score, status")
    .eq("id", matchId)
    .single();

  if (!match) {
    return {
      canUpload: false,
      teamId: null,
      reason: "경기를 찾을 수 없습니다",
    };
  }

  // 3. Check if match is already finished
  if (match.status === "finished") {
    return {
      canUpload: false,
      teamId: null,
      reason: "이미 완료된 경기입니다",
    };
  }

  // 4. Check if user is on either team's roster (active player)
  const { data: rosters } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", userId)
    .eq("season_id", seasonId)
    .eq("is_active", true)
    .in("team_id", [match.home_team_id, match.away_team_id]);

  if (!rosters || rosters.length === 0) {
    return {
      canUpload: false,
      teamId: null,
      reason: "이 경기에 참가하는 팀의 선수가 아닙니다",
    };
  }

  // User is on one of the teams - allow upload
  // Team members automatically have permission to upload their team's match results
  return {
    canUpload: true,
    teamId: rosters[0].team_id,
    reason: "팀 멤버 권한",
  };
}

/**
 * Get list of matches that the current user can upload results for
 *
 * @param userId - Current user ID
 * @param seasonId - Season ID to filter matches
 * @returns Array of match IDs that user has permission to upload
 */
export async function getUserUploadableMatches(
  userId: string,
  seasonId: string
): Promise<string[]> {
  const supabase = await createClient();

  // 1. Check if user is admin or staff
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (profile && ["admin", "staff"].includes(profile.role)) {
    // Admin/Staff can see all scheduled/live matches
    const { data: matches } = await supabase
      .from("matches")
      .select("id")
      .eq("season_id", seasonId)
      .in("status", ["scheduled", "live"]);

    return matches ? matches.map((m) => m.id) : [];
  }

  // 2. Get user's teams for this season
  const { data: rosters } = await supabase
    .from("team_rosters")
    .select("team_id")
    .eq("player_id", userId)
    .eq("season_id", seasonId)
    .eq("is_active", true);

  if (!rosters || rosters.length === 0) {
    return [];
  }

  const teamIds = rosters.map((r) => r.team_id);

  // 3. Get matches where user's team is playing (home or away)
  const { data: matches } = await supabase
    .from("matches")
    .select("id")
    .eq("season_id", seasonId)
    .in("status", ["scheduled", "live"])
    .or(`home_team_id.in.(${teamIds.join(",")}),away_team_id.in.(${teamIds.join(",")})`);

  return matches ? matches.map((m) => m.id) : [];
}

/**
 * Check if a user is a team manager (captain or vice captain)
 *
 * @param userId - User ID to check
 * @param teamId - Team ID
 * @param seasonId - Season ID
 * @returns True if user is an active captain or vice captain
 */
export async function isTeamManager(
  userId: string,
  teamId: string,
  seasonId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: role } = await supabase
    .from("team_roles")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", userId)
    .eq("season_id", seasonId)
    .in("role", ["captain", "vice_captain"])
    .eq("is_active", true)
    .maybeSingle();

  return !!role;
}

/**
 * Check if a user is a team captain
 *
 * @param userId - User ID to check
 * @param teamId - Team ID
 * @param seasonId - Season ID
 * @returns True if user is an active captain
 */
export async function isTeamCaptain(
  userId: string,
  teamId: string,
  seasonId: string
): Promise<boolean> {
  const supabase = await createClient();

  const { data: role } = await supabase
    .from("team_roles")
    .select("id")
    .eq("team_id", teamId)
    .eq("player_id", userId)
    .eq("season_id", seasonId)
    .eq("role", "captain")
    .eq("is_active", true)
    .maybeSingle();

  return !!role;
}

/**
 * Get all active managers (captains and vice captains) for a team
 *
 * @param teamId - Team ID
 * @param seasonId - Season ID
 * @returns Array of team roles with player information
 */
export async function getTeamManagers(
  teamId: string,
  seasonId: string
): Promise<Array<TeamRole & { player: { psn_id: string; email: string } }>> {
  const supabase = await createClient();

  const { data: managers } = await supabase
    .from("team_roles")
    .select(`
      *,
      player:profiles!team_roles_player_id_fkey(psn_id, email)
    `)
    .eq("team_id", teamId)
    .eq("season_id", seasonId)
    .in("role", ["captain", "vice_captain"])
    .eq("is_active", true)
    .order("role", { ascending: true }); // captain first, then vice_captain

  return managers || [];
}
