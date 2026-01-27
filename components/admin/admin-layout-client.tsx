"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu,
  X,
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  FileSpreadsheet,
  UserCheck,
  UserCog,
  Shuffle,
  Award,
  AlertTriangle,
  Ban,
  Crown,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type IconKey =
  | "dashboard"
  | "seasons"
  | "teams"
  | "teamRequests"
  | "teamManagement"
  | "teamRoles"
  | "conferenceDraw"
  | "matches"
  | "uploadSchedule"
  | "disciplines"
  | "users"
  | "playoffs"
  | "history"
  | "broadcast";

type NavItem = {
  href: string;
  label: string;
  icon: IconKey;
};

type AdminLayoutClientProps = {
  user: any;
  navItems: NavItem[];
  children: React.ReactNode;
};

export function AdminLayoutClient({
  user,
  navItems,
  children,
}: AdminLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const iconMap: Record<IconKey, React.ComponentType<{ className?: string }>> = {
    dashboard: LayoutDashboard,
    seasons: Trophy,
    teams: Users,
    teamRequests: UserCheck,
    teamManagement: AlertTriangle,
    teamRoles: Crown,
    conferenceDraw: Shuffle,
    matches: Calendar,
    uploadSchedule: FileSpreadsheet,
    disciplines: Ban,
    users: UserCog,
    playoffs: Trophy,
    history: Award,
    broadcast: Megaphone,
  };

  return (
    <div className="flex min-h-screen">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-background"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 h-screen w-64 border-r bg-card z-40 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
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

          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground"
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
              <p className="font-medium">{user.profile?.psn_id || "관리자"}</p>
              <p className="text-xs truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full overflow-x-hidden bg-background">
        <div className="container mx-auto p-4 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
