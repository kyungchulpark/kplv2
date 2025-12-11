import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, BarChart3, Users } from "lucide-react";

interface HeroSectionProps {
  seasonName: string;
  teamsCount: number;
  finishedMatches: number;
  scheduleDays: string;
}

export function HeroSection({
  seasonName,
  teamsCount,
  finishedMatches,
  scheduleDays,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white/80 to-transparent"></div>

      <div className="container relative mx-auto px-4 py-24 md:py-32">
        <div className="flex flex-col items-center space-y-8 text-center">
          <div className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Season snapshot
          </div>

          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-emerald-500 text-4xl font-bold text-white shadow-2xl">
            KPL
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 md:text-7xl">
              {seasonName}
            </h1>
            <p className="text-xl text-slate-500 md:text-2xl">
              NBA 2K Online eSports League
            </p>
          </div>

          <p className="max-w-2xl text-lg text-slate-600">
            Real-time schedule, standings, and player stats for KPL. All data stays in sync with the latest match results.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/standings">
              <Button
                size="lg"
                className="min-w-[200px] bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Trophy className="mr-2 h-5 w-5" />
                Standings
              </Button>
            </Link>
            <Link href="/schedule">
              <Button
                size="lg"
                variant="outline"
                className="min-w-[200px] border-slate-200 text-slate-900 hover:bg-slate-50"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Schedule
              </Button>
            </Link>
          </div>

          <div className="grid w-full max-w-4xl grid-cols-2 gap-4 pt-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center space-x-2 text-emerald-600">
                <Users className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold text-slate-900">
                {teamsCount}
              </div>
              <div className="mt-1 text-center text-sm text-slate-500">Teams</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center space-x-2 text-emerald-600">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold text-slate-900">
                {finishedMatches}
              </div>
              <div className="mt-1 text-center text-sm text-slate-500">
                Finished Games
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center space-x-2 text-emerald-600">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold text-slate-900">
                Live
              </div>
              <div className="mt-1 text-center text-sm text-slate-500">
                Active Season
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-center space-x-2 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="mt-2 text-center text-3xl font-bold text-slate-900">
                {scheduleDays}
              </div>
              <div className="mt-1 text-center text-sm text-slate-500">
                Weekly Slots
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
