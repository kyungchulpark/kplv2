import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { psn_id, youtube_channel } = await request.json();

        if (!psn_id || psn_id.trim().length < 3) {
            return NextResponse.json(
                { error: "Valid PSN ID is required" },
                { status: 400 }
            );
        }

        const normalizedPsnId = psn_id.trim();
        const adminClient = createAdminClient();

        // 1. Check for legacy profile with this PSN ID
        const { data: legacyProfile } = await adminClient
            .from("profiles")
            .select("id")
            .ilike("psn_id", normalizedPsnId)
            .eq("is_legacy", true)
            .maybeSingle();

        if (legacyProfile) {
            // === LEGACY MERGE FLOW ===
            console.log(`Creating profile: Found legacy profile ${legacyProfile.id} for ${normalizedPsnId}. Merging...`);

            // 1. Migrate match_stats
            const { error: statsError } = await adminClient
                .from("match_stats")
                .update({ player_id: user.id })
                .eq("player_id", legacyProfile.id);

            if (statsError) throw statsError;

            // 2. Migrate team_rosters
            const { error: rosterError } = await adminClient
                .from("team_rosters")
                .update({ player_id: user.id })
                .eq("player_id", legacyProfile.id);

            if (rosterError) throw rosterError;

            // 3. Migrate teams (captain)
            const { error: captainError } = await adminClient
                .from("teams")
                .update({ captain_id: user.id })
                .eq("captain_id", legacyProfile.id);

            if (captainError) throw captainError;

            // 4. Migrate psn_id_history (unlikely but safe to do)
            const { error: historyError } = await adminClient
                .from("psn_id_history")
                .update({ user_id: user.id })
                .eq("user_id", legacyProfile.id);

            if (historyError) throw historyError;

            // 5. Delete legacy profile
            const { error: deleteError } = await adminClient
                .from("profiles")
                .delete()
                .eq("id", legacyProfile.id);

            if (deleteError) throw deleteError;

            // 6. Update current user profile
            const { error: updateError } = await adminClient
                .from("profiles")
                .upsert({
                    id: user.id,
                    psn_id: normalizedPsnId,
                    youtube_channel: youtubeChannel || null,
                    role: "user", // Default role
                    is_active: true,
                    is_legacy: false,
                    updated_at: new Date().toISOString(),
                });

            if (updateError) throw updateError;

            return NextResponse.json({ success: true, merged: true });

        } else {
            // === REGULAR SIGN UP FLOW ===

            // Check for duplicate PSN ID (exclude current user)
            const { data: existing } = await adminClient
                .from("profiles")
                .select("id")
                .ilike("psn_id", normalizedPsnId)
                .neq("id", user.id)
                .maybeSingle();

            if (existing) {
                return NextResponse.json(
                    { error: "PSN ID is already in use by another user." },
                    { status: 409 }
                );
            }

            // Update/Create profile
            const { error: updateError } = await adminClient
                .from("profiles")
                .upsert({
                    id: user.id,
                    psn_id: normalizedPsnId,
                    youtube_channel: youtubeChannel || null,
                    role: "user",
                    is_active: true,
                    is_legacy: false,
                    updated_at: new Date().toISOString(),
                });

            if (updateError) throw updateError;

            return NextResponse.json({ success: true, merged: false });
        }

    } catch (error: any) {
        console.error("Profile completion error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to complete profile setup" },
            { status: 500 }
        );
    }
}
