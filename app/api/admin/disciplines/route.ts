import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ApplyDisciplineRequest {
  playerId: string;
  seasonId: string;
  games: number;
  reason: string;
}

interface AdjustGamesRequest {
  disciplineId: string;
  adjustment: number; // +1 or -1
}

interface RemoveDisciplineRequest {
  disciplineId: string;
}

/**
 * GET /api/admin/disciplines?seasonId={seasonId}
 * Get all disciplines for a season
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");

    if (!seasonId) {
      return NextResponse.json(
        { error: "seasonId is required" },
        { status: 400 }
      );
    }

    const { data: disciplines, error } = await supabase
      .from("player_disciplines")
      .select(`
        *,
        player:profiles!player_disciplines_player_id_fkey(id, psn_id, email),
        applied_by_user:profiles!player_disciplines_applied_by_fkey(psn_id, email)
      `)
      .eq("season_id", seasonId)
      .order("is_active", { ascending: false })
      .order("applied_at", { ascending: false });

    if (error) {
      console.error("[Disciplines API] Error fetching disciplines:", error);
      return NextResponse.json(
        { error: "Failed to fetch disciplines" },
        { status: 500 }
      );
    }

    return NextResponse.json({ disciplines });
  } catch (error: any) {
    console.error("[Disciplines API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/disciplines
 * Apply a new discipline to a player
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin/staff
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

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body: ApplyDisciplineRequest = await request.json();
    const { playerId, seasonId, games, reason } = body;

    if (!playerId || !seasonId || !games || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (games < 1) {
      return NextResponse.json(
        { error: "Suspension must be at least 1 game" },
        { status: 400 }
      );
    }

    // Check if player already has an active discipline
    const { data: existingDiscipline } = await supabase
      .from("player_disciplines")
      .select("id, player:profiles!player_disciplines_player_id_fkey(psn_id)")
      .eq("player_id", playerId)
      .eq("season_id", seasonId)
      .eq("is_active", true)
      .gt("games_remaining", 0)
      .maybeSingle();

    if (existingDiscipline) {
      return NextResponse.json(
        {
          error: `${existingDiscipline.player?.psn_id}는 이미 활성 징계가 있습니다. 기존 징계를 먼저 제거하거나 수정해주세요.`,
        },
        { status: 400 }
      );
    }

    // Apply the discipline
    const { data: newDiscipline, error: insertError } = await supabase
      .from("player_disciplines")
      .insert({
        player_id: playerId,
        season_id: seasonId,
        games_suspended: games,
        games_remaining: games,
        reason: reason,
        applied_by: user.id,
        is_active: true,
      })
      .select(
        `
        *,
        player:profiles!player_disciplines_player_id_fkey(id, psn_id, email)
      `
      )
      .single();

    if (insertError) {
      console.error("[Disciplines API] Error applying discipline:", insertError);
      return NextResponse.json(
        { error: "Failed to apply discipline", details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ discipline: newDiscipline }, { status: 201 });
  } catch (error: any) {
    console.error("[Disciplines API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/disciplines
 * Adjust games_remaining for a discipline (+1 or -1)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin/staff
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

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body: AdjustGamesRequest = await request.json();
    const { disciplineId, adjustment } = body;

    if (!disciplineId || !adjustment) {
      return NextResponse.json(
        { error: "disciplineId and adjustment are required" },
        { status: 400 }
      );
    }

    if (adjustment !== 1 && adjustment !== -1) {
      return NextResponse.json(
        { error: "adjustment must be +1 or -1" },
        { status: 400 }
      );
    }

    // Get current discipline
    const { data: discipline } = await supabase
      .from("player_disciplines")
      .select("*")
      .eq("id", disciplineId)
      .single();

    if (!discipline) {
      return NextResponse.json(
        { error: "Discipline not found" },
        { status: 404 }
      );
    }

    const newGamesRemaining = discipline.games_remaining + adjustment;

    // Validate new games_remaining
    if (newGamesRemaining < 0) {
      return NextResponse.json(
        { error: "Cannot reduce games below 0" },
        { status: 400 }
      );
    }

    if (newGamesRemaining > discipline.games_suspended) {
      return NextResponse.json(
        { error: "games_remaining cannot exceed games_suspended" },
        { status: 400 }
      );
    }

    // Update games_remaining
    const updateData: any = {
      games_remaining: newGamesRemaining,
    };

    // If reaching 0, mark as inactive and set completed_at
    if (newGamesRemaining === 0) {
      updateData.is_active = false;
      updateData.completed_at = new Date().toISOString();
    } else {
      // If going back from 0, reactivate
      updateData.is_active = true;
      updateData.completed_at = null;
    }

    const { data: updatedDiscipline, error: updateError } = await supabase
      .from("player_disciplines")
      .update(updateData)
      .eq("id", disciplineId)
      .select()
      .single();

    if (updateError) {
      console.error("[Disciplines API] Error adjusting games:", updateError);
      return NextResponse.json(
        { error: "Failed to adjust games" },
        { status: 500 }
      );
    }

    return NextResponse.json({ discipline: updatedDiscipline });
  } catch (error: any) {
    console.error("[Disciplines API] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/disciplines?disciplineId={disciplineId}
 * Remove (deactivate) a discipline
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin/staff
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

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const disciplineId = searchParams.get("disciplineId");

    if (!disciplineId) {
      return NextResponse.json(
        { error: "disciplineId is required" },
        { status: 400 }
      );
    }

    // Deactivate the discipline
    const { data: removedDiscipline, error: updateError } = await supabase
      .from("player_disciplines")
      .update({
        is_active: false,
        games_remaining: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", disciplineId)
      .select()
      .single();

    if (updateError) {
      console.error("[Disciplines API] Error removing discipline:", updateError);
      return NextResponse.json(
        { error: "Failed to remove discipline" },
        { status: 500 }
      );
    }

    return NextResponse.json({ discipline: removedDiscipline });
  } catch (error: any) {
    console.error("[Disciplines API] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
