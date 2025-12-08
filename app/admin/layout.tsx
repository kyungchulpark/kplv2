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
      icon: LayoutDashboard,
    },
    {
      href: "/admin/seasons",
      label: "Seasons",
      icon: Trophy,
    },
    {
      href: "/admin/teams",
      label: "Teams",
      icon: Users,
    },
    {
      href: "/admin/team-requests",
      label: "Team Requests",
      icon: UserCheck,
    },
    {
      href: "/admin/conference-draw",
      label: "Conference Draw",
      icon: Shuffle,
    },
    {
      href: "/admin/matches",
      label: "Matches",
      icon: Calendar,
    },
    {
      href: "/admin/upload-schedule",
      label: "Upload Schedule",
      icon: FileSpreadsheet,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: UserCog,
    },
  ];

  return (
    <AdminLayoutClient user={user} navItems={navItems}>
      {children}
    </AdminLayoutClient>
  );
}
