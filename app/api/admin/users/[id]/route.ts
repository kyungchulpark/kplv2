import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check if user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get update data from request
    const body = await request.json();
    const { role, psn_id } = body;

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("profiles")
      .update({
        role,
        psn_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check if user is admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if user is captain or member of any team
    const { data: captainTeams } = await supabase
      .from("teams")
      .select("id")
      .eq("captain_id", id);

    const { data: rosterTeams } = await supabase
      .from("team_rosters")
      .select("id")
      .eq("player_id", id)
      .eq("is_active", true);

    if ((captainTeams && captainTeams.length > 0) || (rosterTeams && rosterTeams.length > 0)) {
      return NextResponse.json(
        { error: "Cannot delete user who is a captain or member of a team" },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS and delete user
    const adminClient = createAdminClient();

    // Delete profile first
    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id);

    if (profileError) {
      console.error("Profile delete error:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Delete auth user using admin API
    const { error: authError } = await adminClient.auth.admin.deleteUser(id);

    if (authError) {
      console.error("Auth delete error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
