import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/supabase/server";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  FileSpreadsheet,
  UserCheck,
  UserCog,
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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nba-red font-bold text-white">
                KPL
              </div>
              <div>
                <h2 className="font-bold">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">관리자 모드</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t p-4">
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">{(user.profile as any)?.psn_id}</p>
              <p className="text-xs">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
