import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar-new";
import { Footer } from "@/components/layout/footer";
import { getCurrentUser } from "@/utils/supabase/server";
import { createClient } from "@/utils/supabase/server";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KPL - Korea Proam League",
  description: "NBA 2K Online League Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  // Get user's team if logged in
  let userTeam = null;
  if (user) {
    try {
      const supabase = await createClient();

      // Get active season (optional)
      const { data: activeSeason } = await supabase
        .from("seasons")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();

      // Check if captain (시즌과 관계없이 팀장인 팀 조회)
      console.log("[Layout] Checking captain team for user:", user.id);
      const { data: captainTeams, error: captainError } = await supabase
        .from("teams")
        .select("id, name, logo_url, captain_id, season_id, created_at")
        .eq("captain_id", user.id)
        .order("created_at", { ascending: false });

      console.log("[Layout] Captain team result:", { captainTeams, captainError });

      if (captainError) {
        console.error("Error fetching captain team:", captainError);
      }

      if (captainTeams && captainTeams.length > 0) {
        let captainTeam = captainTeams[0];
        if (activeSeason?.id) {
          const activeCaptainTeam = captainTeams.find(
            (team) => team.season_id === activeSeason.id
          );
          if (activeCaptainTeam) {
            captainTeam = activeCaptainTeam;
          }
        }
        console.log("[Layout] Found captain team:", captainTeam.name);
        userTeam = captainTeam;
      } else {
        console.log("[Layout] No captain team, checking roster");
        // Check if roster member (시즌과 관계없이)
        const { data: rosterTeam, error: rosterError } = await supabase
          .from("team_rosters")
          .select("team:teams(id, name, logo_url)")
          .eq("player_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        console.log("[Layout] Roster team result:", { rosterTeam, rosterError });

        if (rosterError) {
          console.error("Error fetching roster team:", rosterError);
        }

        if (rosterTeam && (rosterTeam as any).team) {
          console.log("[Layout] Found roster team:", (rosterTeam as any).team.name);
          userTeam = (rosterTeam as any).team;
        } else {
          console.log("[Layout] No team found for user");
        }
      }

      console.log("[Layout] Final userTeam:", userTeam);
    } catch (error) {
      console.error("Error in layout team fetch:", error);
    }
  }

  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex min-h-screen flex-col`}
      >
        <Navbar user={user} userTeam={userTeam} />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
