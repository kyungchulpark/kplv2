import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

/**
 * OAuth callback handler
 * This route is called by Supabase after successful OAuth authentication
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Check if profile exists and has psn_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        // If profile doesn't exist or missing PSN ID, redirect to profile setup
        if (!profile || !profile.psn_id) {
          return NextResponse.redirect(`${origin}/auth/setup`);
        }

        // If profile exists, redirect to home or the original destination
        const redirectTo = requestUrl.searchParams.get("redirect") || "/";
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }
  }

  // If there's an error or no code, redirect to home
  return NextResponse.redirect(`${origin}/`);
}
