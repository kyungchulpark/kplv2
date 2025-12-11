"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { formatMatchTimeKST, formatMatchDateLongKST } from "@/utils/date-helpers";

type Match = {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  is_forfeit?: boolean | null;
  forfeit_winner_id?: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
};

interface TodayMatchesProps {
  matches: Match[];
}

export function TodayMatches({ matches }: TodayMatchesProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const getStatusBadge = (status: Match["status"]) => {
    switch (status) {
      case "live":
        return <Badge className="bg-rose-500 text-white">LIVE</Badge>;
      case "finished":
        return (
          <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
            Final
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="border border-slate-200 bg-slate-100 text-slate-600">
            Scheduled
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const formatMatchTime = (dateString: string) => {
    return formatMatchTimeKST(dateString);
  };

  const formatMatchDate = (dateString: string) => {
    return formatMatchDateLongKST(dateString);
  };

  const sorted = useMemo(
    () =>
      [...matches].sort(
        (a, b) =>
          new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
      ),
    [matches]
  );

  const scroll = (direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "prev" ? -320 : 320;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">Recent Matches</h2>
          <p className="text-muted-foreground">
            {sorted.length > 0 ? formatMatchDate(sorted[0].match_date) : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Last 20 games
          </Badge>
          <div className="flex items-center gap-1">
            <button
              className="rounded-full border p-2 hover:bg-accent"
              onClick={() => scroll("prev")}
              aria-label="Previous games"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              className="rounded-full border p-2 hover:bg-accent"
              onClick={() => scroll("next")}
              aria-label="Next games"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-muted-foreground py-6">No matches.</div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
          >
            {sorted.map((match) => (
              <Link key={match.id} href={`/matches/${match.id}`} className="snap-start">
                <Card className="min-w-[280px] w-[300px] border border-slate-100 bg-white text-slate-900 transition-shadow hover:shadow-lg">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{formatMatchTime(match.match_date)}</span>
                      <div className="flex items-center gap-2">
                        {match.is_forfeit && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <Flag className="h-3 w-3" />
                            Forfeit
                          </Badge>
                        )}
                        {getStatusBadge(match.status)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {match.home_team.logo_url ? (
                          <img
                            src={match.home_team.logo_url}
                            alt={match.home_team.name}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500 text-xs font-bold text-white">
                            {match.home_team.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{match.home_team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {match.home_team.conference}
                          </p>
                        </div>
                      </div>

                      {match.status === "finished" && (
                        <div className="text-xl font-bold">
                          {match.home_score}
                        </div>
                      )}
                    </div>

                    <div className="text-center text-xs text-muted-foreground">
                      VS
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {match.away_team.logo_url ? (
                          <img
                            src={match.away_team.logo_url}
                            alt={match.away_team.name}
                            className="h-8 w-8 object-contain"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-emerald-500 text-xs font-bold text-white">
                            {match.away_team.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold">{match.away_team.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {match.away_team.conference}
                          </p>
                        </div>
                      </div>

                      {match.status === "finished" && (
                        <div className="text-xl font-bold">
                          {match.away_score}
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-muted-foreground text-right">
                      {formatMatchDate(match.match_date)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
