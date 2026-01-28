"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, LogIn, User, ExternalLink, Plus, FileText, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
}

const navLinks = [
  { href: "/schedule", label: "일정" },
  { href: "/standings", label: "순위" },
  { href: "/playoffs", label: "플레이오프" },
  { href: "/stats", label: "기록실" },
  { href: "/teams", label: "팀" },
  { href: "/history", label: "챔피언십" },
  { href: "/live", label: "라이브" },
  { href: "/stats/upload", label: "경기결과 업로드" },
  { href: "https://cafe.naver.com/nbakpl", label: "네이버 카페", external: true },
];

export function Navbar({ user }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nba-red font-bold text-white">
                KPL
              </div>
              <span className="hidden text-xl font-bold sm:inline-block">
                Korea Proam League
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-1 md:flex">
            {navLinks.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground inline-flex items-center gap-1"
                >
                  {link.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Right Side - Auth Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="hidden items-center space-x-2 md:flex">
                <Link href="/teams/create">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    팀 생성
                  </Button>
                </Link>
                <Link href="/teams/my-requests">
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    내 신청
                  </Button>
                </Link>
                {user.profile?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" size="sm">
                      관리
                    </Button>
                  </Link>
                )}
                {user.profile?.role === "staff" && (
                  <Link href="/staff">
                    <Button variant="outline" size="sm">
                      관리
                    </Button>
                  </Link>
                )}
                {user.profile?.role === "captain" && (
                  <Link href="/team/manage">
                    <Button variant="outline" size="sm">
                      팀 관리
                    </Button>
                  </Link>
                )}
                <Link href="/messages">
                  <Button variant="ghost" size="icon" className="relative">
                    <MessageCircle className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/profile">
                  <Button variant="default" size="sm">
                    <User className="mr-2 h-4 w-4" />
                    {user.profile?.psn_id || "내 정보"}
                  </Button>
                </Link>
              </div>
            ) : (
              <Link href="/auth/signin" className="hidden md:block">
                <Button variant="default" size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  로그인
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
          mobileMenuOpen ? "max-h-96" : "max-h-0"
        )}
      >
        <div className="space-y-1 border-t px-4 pb-3 pt-2">
          {navLinks.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            )
          )}

          <div className="border-t pt-3">
            {user ? (
              <div className="space-y-2">
                <Link href="/teams/create" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    팀 생성
                  </Button>
                </Link>
                <Link href="/teams/my-requests" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    내 신청
                  </Button>
                </Link>
                {user.profile?.role === "admin" && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      관리
                    </Button>
                  </Link>
                )}
                {user.profile?.role === "staff" && (
                  <Link href="/staff" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      관리
                    </Button>
                  </Link>
                )}
                {user.profile?.role === "captain" && (
                  <Link
                    href="/team/manage"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      팀 관리
                    </Button>
                  </Link>
                )}
                <Link href="/messages" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    메시지
                  </Button>
                </Link>
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="default" size="sm" className="w-full">
                    <User className="mr-2 h-4 w-4" />
                    {user.profile?.psn_id || "내 정보"}
                  </Button>
                </Link>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button variant="default" size="sm" className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  로그인
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
