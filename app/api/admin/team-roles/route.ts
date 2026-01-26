import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface GrantRoleRequest {
  teamId: string;
  playerId: string;
  seasonId: string;
  role: "captain" | "vice_captain" | "coach" | "manager";
}

interface RevokeRoleRequest {
  roleId: string;
}

/**
 * GET /api/admin/team-roles?teamId={teamId}&seasonId={seasonId}
 * Get all team roles for a team in a season
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const seasonId = searchParams.get("seasonId");

    if (!teamId || !seasonId) {
      return NextResponse.json(
        { error: "teamId and seasonId are required" },
        { status: 400 }
      );
    }

    // Get all active roles for this team
    const { data: roles, error } = await supabase
      .from("team_roles")
      .select(`
        *,
        player:profiles!team_roles_player_id_fkey(id, psn_id, email),
        granted_by_user:profiles!team_roles_granted_by_fkey(psn_id, email)
      `)
      .eq("team_id", teamId)
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .order("role", { ascending: true })
      .order("granted_at", { ascending: false });

    if (error) {
      console.error("[Team Roles API] Error fetching roles:", error);
      return NextResponse.json(
        { error: "Failed to fetch team roles" },
        { status: 500 }
      );
    }

    return NextResponse.json({ roles });
  } catch (error: any) {
    console.error("[Team Roles API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/team-roles
 * Grant a role to a player
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin/staff or team captain
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const body: GrantRoleRequest = await request.json();
    const { teamId, playerId, seasonId, role } = body;

    if (!teamId || !playerId || !seasonId || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify permissions
    const isAdmin = profile && ["admin", "staff"].includes(profile.role);
    const isCaptain =
      !isAdmin &&
      role === "vice_captain" &&
      (await checkIsCaptain(user.id, teamId, seasonId, supabase));

    if (!isAdmin && !isCaptain) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Check if player is on the team roster
    const { data: rosterCheck } = await supabase
      .from("team_rosters")
      .select("id")
      .eq("team_id", teamId)
      .eq("player_id", playerId)
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .maybeSingle();

    if (!rosterCheck) {
      return NextResponse.json(
        { error: "Player is not on this team's roster" },
        { status: 400 }
      );
    }

    // If granting captain role, check if there's already an active captain
    if (role === "captain") {
      const { data: existingCaptain } = await supabase
        .from("team_roles")
        .select("id, player:profiles!team_roles_player_id_fkey(psn_id)")
        .eq("team_id", teamId)
        .eq("season_id", seasonId)
        .eq("role", "captain")
        .eq("is_active", true)
        .maybeSingle();

      if (existingCaptain) {
        return NextResponse.json(
          {
            error: `A captain already exists for this team. Please revoke the existing captain (${existingCaptain.player?.psn_id}) first.`,
          },
          { status: 400 }
        );
      }
    }

    // Grant the role
    const { data: newRole, error: insertError } = await supabase
      .from("team_roles")
      .insert({
        team_id: teamId,
        player_id: playerId,
        season_id: seasonId,
        role: role,
        granted_by: user.id,
        is_active: true,
      })
      .select(
        `
        *,
        player:profiles!team_roles_player_id_fkey(id, psn_id, email)
      `
      )
      .single();

    if (insertError) {
      console.error("[Team Roles API] Error granting role:", insertError);
      return NextResponse.json(
        { error: "Failed to grant role", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ role: newRole }, { status: 201 });
  } catch (error: any) {
    console.error("[Team Roles API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/team-roles
 * Revoke a role (set is_active to false)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin/staff or team captain
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const body: RevokeRoleRequest = await request.json();
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json(
        { error: "roleId is required" },
        { status: 400 }
      );
    }

    // Get the role to revoke
    const { data: roleToRevoke } = await supabase
      .from("team_roles")
      .select("*")
      .eq("id", roleId)
      .single();

    if (!roleToRevoke) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Verify permissions
    const isAdmin = profile && ["admin", "staff"].includes(profile.role);
    const isCaptain =
      !isAdmin &&
      roleToRevoke.role === "vice_captain" &&
      (await checkIsCaptain(
        user.id,
        roleToRevoke.team_id,
        roleToRevoke.season_id,
        supabase
      ));

    if (!isAdmin && !isCaptain) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Revoke the role
    const { data: revokedRole, error: updateError } = await supabase
      .from("team_roles")
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", roleId)
      .select()
      .single();

    if (updateError) {
      console.error("[Team Roles API] Error revoking role:", updateError);
      return NextResponse.json(
        { error: "Failed to revoke role" },
        { status: 500 }
      );
    }

    return NextResponse.json({ role: revokedRole });
  } catch (error: any) {
    console.error("[Team Roles API] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check if a user is a captain of a team
 */
async function checkIsCaptain(
  userId: string,
  teamId: string,
  seasonId: string,
  supabase: any
): Promise<boolean> {
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
