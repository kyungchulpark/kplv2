"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatMatchTimeKST, formatMatchDateLongKST } from "@/utils/date-helpers";
import { MatchDetailDialog } from "@/components/schedule/match-detail-dialog";

type Match = {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  game_password?: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
    rank?: number | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
    rank?: number | null;
  };
};

interface UpcomingMatchesProps {
  matches: Match[];
}

export function UpcomingMatches({ matches }: UpcomingMatchesProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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
          new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
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
          <h2 className="text-3xl font-bold">Upcoming Matches</h2>
          <p className="text-muted-foreground">
            {sorted.length > 0 ? `Next match: ${formatMatchDate(sorted[0].match_date)}` : "No upcoming matches"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Next {sorted.length} {sorted.length === 1 ? "game" : "games"}
          </Badge>
          {sorted.length > 1 && (
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
          )}
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center text-muted-foreground py-6 border border-dashed rounded-lg bg-muted/20">
          No upcoming matches scheduled.
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory"
          >
            {sorted.map((match) => (
              <button
                key={match.id}
                type="button"
                className="snap-start text-left focus:outline-none"
                onClick={() => setSelectedMatch(match)}
              >
                <Card className="min-w-[280px] w-[300px] border border-blue-100 bg-blue-50/30 text-slate-900 transition-shadow hover:shadow-lg">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-blue-700">{formatMatchTime(match.match_date)}</span>
                      <Badge className="border border-blue-200 bg-blue-100 text-blue-700">
                        Scheduled
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {match.home_team.logo_url ? (
                          <img
                              src={match.home_team.logo_url}
                              alt={match.home_team.name}
                              className="h-8 w-8 object-contain"
                              loading="lazy"
                              decoding="async"
                            />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500 text-xs font-bold text-white">
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
                    </div>

                    <div className="text-center text-xs font-semibold text-blue-600">
                      VS
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {match.away_team.logo_url ? (
                          <img
                              src={match.away_team.logo_url}
                              alt={match.away_team.name}
                              className="h-8 w-8 object-contain"
                              loading="lazy"
                              decoding="async"
                            />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500 text-xs font-bold text-white">
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
                    </div>

                    <div className="text-sm font-medium text-blue-700 text-right">
                      {formatMatchDate(match.match_date)}
                    </div>

                    {match.game_password && (
                      <div className="pt-2 border-t border-blue-200">
                        <p className="text-xs text-blue-600">
                          Password: <code className="font-mono font-bold bg-blue-100 px-1 rounded">{match.game_password}</code>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMatch && (
        <MatchDetailDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}
    </section>
  );
}
