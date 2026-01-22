"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Menu,
  X,
  LogIn,
  User,
  ExternalLink,
  ChevronDown,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface NavbarProps {
  user: {
    id: string;
    email?: string;
    profile?: {
      psn_id: string;
      avatar_url?: string | null;
      role: "admin" | "staff" | "captain" | "user";
    } | null;
  } | null;
  userTeam?: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
}

export function Navbar({ user, userTeam }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const userRole = (user?.profile as any)?.role;
  const isOperator = user && ["admin", "staff"].includes(userRole);
  const canManageTeam =
    !!userTeam && !!user && (userRole === "captain" || isOperator);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 font-bold text-white shadow-sm">
                KPL
              </div>
              <span className="hidden text-xl font-bold sm:inline-block">
                Korea Proam League
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-1 md:flex">
            <Link
              href="/schedule"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Schedule
            </Link>
            <Link
              href="/standings"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Standings
            </Link>
            <Link
              href="/playoffs"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Playoffs
            </Link>

            {/* Stats Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground inline-flex items-center gap-1">
                Stats
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/stats" className="cursor-pointer">
                    League stats
                  </Link>
                </DropdownMenuItem>
                {user && (
                  <DropdownMenuItem asChild>
                    <Link href="/stats/upload" className="cursor-pointer">
                      Upload results
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Teams Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground inline-flex items-center gap-1">
                Teams
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem asChild>
                  <Link href="/teams" className="cursor-pointer">
                    All teams
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/players" className="cursor-pointer">
                    Players
                  </Link>
                </DropdownMenuItem>
                {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/teams/create" className="cursor-pointer">
                        Submit a team
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/teams/my-requests" className="cursor-pointer">
                        My requests
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/history"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              History
            </Link>

            <Link
              href="/live"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Live
            </Link>

            <a
              href="https://cafe.naver.com/nbakpl"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground inline-flex items-center gap-1"
            >
              Naver Cafe
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {/* Right Side - Auth & Team Info */}
          <div className="flex items-center space-x-2">
            {user ? (
              <div className="hidden items-center space-x-2 md:flex">
                {/* My Team Shortcut */}
                {userTeam && (
                  <Link href={`/teams/${userTeam.id}`}>
                    <Button variant="outline" size="sm" className="gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                      {userTeam.logo_url ? (
                        <img
                          src={userTeam.logo_url}
                          alt={userTeam.name}
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                      <span className="max-w-[100px] truncate">{userTeam.name}</span>
                    </Button>
                  </Link>
                )}

                {/* Team Management */}
                {canManageTeam && (
                  <Link href="/team/manage">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Team Manage
                    </Button>
                  </Link>
                )}

                {/* Admin/Staff Links */}
                {isOperator && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-50">
                      Admin
                    </Button>
                  </Link>
                )}

                {/* Profile */}
                <Link href="/profile">
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {user.profile?.psn_id || "Profile"}
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href="/auth/signin" className="hidden md:block">
                <Button
                  variant="default"
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "max-h-[600px]" : "max-h-0"
        )}
      >
        <div className="space-y-1 border-t px-4 pb-3 pt-2">
          {/* Main Links */}
          <Link
            href="/schedule"
            className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Schedule
          </Link>
          <Link
            href="/standings"
            className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Standings
          </Link>
          <Link
            href="/playoffs"
            className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Playoffs
          </Link>

          {/* Stats Submenu */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-sm font-semibold text-foreground">Stats</div>
            <Link
              href="/stats"
              className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              League stats
            </Link>
            {user && (
              <Link
                href="/stats/upload"
                className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Upload results
              </Link>
            )}
          </div>

          {/* Team Submenu */}
          <div className="space-y-1">
            <div className="px-3 py-2 text-sm font-semibold text-foreground">Teams</div>
            <Link
              href="/teams"
              className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              All teams
            </Link>
            <Link
              href="/players"
              className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setMobileMenuOpen(false)}
            >
              Players
            </Link>
            {user && (
              <>
                <Link
                  href="/teams/create"
                  className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Submit a team
                </Link>
                <Link
                  href="/teams/my-requests"
                  className="block rounded-md px-6 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My requests
                </Link>
              </>
            )}
          </div>

          <Link
            href="/history"
            className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            History
          </Link>

          <Link
            href="/live"
            className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Live
          </Link>

          <a
            href="https://cafe.naver.com/nbakpl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            onClick={() => setMobileMenuOpen(false)}
          >
            Naver Cafe
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* User Actions */}
          <div className="border-t pt-3 space-y-2">
            {user ? (
              <>
                {/* My Team */}
                {userTeam && (
                  <Link
                    href={`/teams/${userTeam.id}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2 border-slate-200 text-slate-700 hover:bg-slate-50">
                      {userTeam.logo_url ? (
                        <img
                          src={userTeam.logo_url}
                          alt={userTeam.name}
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                      My team: {userTeam.name}
                    </Button>
                  </Link>
                )}

                {canManageTeam && (
                  <Link href="/team/manage" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                      Team Manage
                    </Button>
                  </Link>
                )}

                {isOperator && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50">
                      Admin
                    </Button>
                  </Link>
                )}
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <User className="mr-2 h-4 w-4" />
                    {user.profile?.psn_id || "Profile"}
                  </Button>
                </Link>
              </>
            ) : (
              <Link
                href="/auth/signin"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant="default"
                  size="sm"
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
