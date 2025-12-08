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
    const supabase = await createClient();

    // Get active season
    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id")
      .eq("is_active", true)
      .single();

    if (activeSeason) {
      // Check if captain
      const { data: captainTeam } = await supabase
        .from("teams")
        .select("id, name, logo_url")
        .eq("captain_id", user.id)
        .eq("season_id", activeSeason.id)
        .single();

      if (captainTeam) {
        userTeam = captainTeam;
      } else {
        // Check if roster member
        const { data: rosterTeam } = await supabase
          .from("team_rosters")
          .select("team:teams(id, name, logo_url)")
          .eq("player_id", user.id)
          .eq("season_id", activeSeason.id)
          .eq("is_active", true)
          .single();

        if (rosterTeam && (rosterTeam as any).team) {
          userTeam = (rosterTeam as any).team;
        }
      }
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
