import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/supabase/server";
import { AdminLayoutClient } from "@/components/admin/admin-layout-client";
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  FileSpreadsheet,
  UserCheck,
  UserCog,
  Shuffle,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || (user.profile as any)?.role !== "admin") {
    redirect("/");
  }

  const navItems = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: "dashboard",
    },
    {
      href: "/admin/seasons",
      label: "Seasons",
      icon: "seasons",
    },
    {
      href: "/admin/teams",
      label: "Teams",
      icon: "teams",
    },
    {
      href: "/admin/team-requests",
      label: "Team Requests",
      icon: "teamRequests",
    },
    {
      href: "/admin/conference-draw",
      label: "Conference Draw",
      icon: "conferenceDraw",
    },
    {
      href: "/admin/matches",
      label: "Matches",
      icon: "matches",
    },
    {
      href: "/admin/upload-schedule",
      label: "Upload Schedule",
      icon: "uploadSchedule",
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: "users",
    },
  ];

  return (
    <AdminLayoutClient user={user} navItems={navItems}>
      {children}
    </AdminLayoutClient>
  );
}
