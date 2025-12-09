import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, BarChart3, Users } from "lucide-react";

interface HeroSectionProps {
  seasonName: string;
  teamsCount: number;
  finishedMatches: number;
  scheduleDays: string;
}

export function HeroSection({ seasonName, teamsCount, finishedMatches, scheduleDays }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>

      <div className="container relative mx-auto px-4 py-24 md:py-32">
        <div className="flex flex-col items-center space-y-8 text-center">
          {/* Logo/Badge */}
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-nba-red text-4xl font-bold text-white shadow-2xl">
            KPL
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-white md:text-7xl">
              {seasonName}
            </h1>
            <p className="text-xl text-gray-300 md:text-2xl">
              NBA 2K Online eSports League
            </p>
          </div>

          {/* Description */}
          <p className="max-w-2xl text-lg text-gray-400">
            Real-time schedule, standings, and player stats for KPL. Data stays in sync with the latest match results.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/standings">
              <Button size="lg" className="min-w-[200px]">
                <Trophy className="mr-2 h-5 w-5" />
                Standings
              </Button>
            </Link>
            <Link href="/schedule">
              <Button size="lg" variant="outline" className="min-w-[200px]">
                <Calendar className="mr-2 h-5 w-5" />
                Schedule
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid w-full max-w-4xl grid-cols-2 gap-4 pt-8 md:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <Users className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">{teamsCount}</div>
              <div className="mt-1 text-center text-sm text-gray-400">Teams</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">{finishedMatches}</div>
              <div className="mt-1 text-center text-sm text-gray-400">Finished Games</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">Live</div>
              <div className="mt-1 text-center text-sm text-gray-400">Active Season</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-center space-x-2 text-nba-red">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold">{scheduleDays}</div>
              <div className="mt-1 text-center text-sm text-gray-400">Weekly Slots</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
