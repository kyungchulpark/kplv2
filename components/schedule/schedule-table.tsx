"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { parseISO, isBefore, startOfDay } from "date-fns";
import { Clock, Key } from "lucide-react";
import { MatchDetailDialog } from "./match-detail-dialog";
import { DateSlider } from "./date-slider";
import { cn } from "@/lib/utils";
import Link from "next/link";

type Match = {
  id: string;
  match_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  match_sequence: string | null;
  game_password: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
};

type ScheduleTableProps = {
  matches: Match[];
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  leagueEnded?: boolean;
};

export function ScheduleTable({ matches, selectedDate, onDateChange, leagueEnded = false }: ScheduleTableProps) {
  const [internalDate, setInternalDate] = useState<string>("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Group matches by date
  const groupedMatches = matches.reduce((acc, match) => {
    const date = match.match_date.split("T")[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(match);
    return acc;
  }, {} as Record<string, Match[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedMatches).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Initialize selected date to today or nearest future date, or last date if all past
  useEffect(() => {
    if (sortedDates.length > 0 && !(selectedDate ?? internalDate)) {
      const today = startOfDay(new Date());
      const futureDate = sortedDates.find(date => !isBefore(parseISO(date), today));
      setInternalDate(futureDate || sortedDates[sortedDates.length - 1]);
    }
  }, [sortedDates, selectedDate, internalDate]);

  // Sync controlled selectedDate into internal state
  useEffect(() => {
    if (selectedDate) {
      setInternalDate(selectedDate);
    }
  }, [selectedDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge className="text-xs bg-blue-600 text-white">
            Scheduled
          </Badge>
        );
      case "live":
        return (
          <Badge className="bg-nba-red text-white animate-pulse text-xs">
            LIVE
          </Badge>
        );
      case "finished":
        return (
          <Badge className="text-xs bg-emerald-600 text-white">
            Final
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="text-xs">
            Cancelled
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderTeamLogo = (team: Match["home_team"]) => {
    if (team.logo_url) {
      return (
        <img
          src={team.logo_url}
          alt={team.name}
          className="h-10 w-10 md:h-12 md:w-12 object-contain"
        />
      );
    }
    return (
      <div className="h-10 w-10 md:h-12 md:w-12 rounded bg-nba-red flex items-center justify-center text-xs md:text-sm font-bold text-white">
        {team.name.substring(0, 2)}
      </div>
    );
  };

  // Derived selected date
  const effectiveDate = selectedDate ?? internalDate;
  const resolvedDate = effectiveDate || sortedDates[0] || "";

  // Filter matches for selected date
  const currentMatches = resolvedDate ? groupedMatches[resolvedDate] || [] : [];

  const formatKstTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  };

  const handleDateChange = (date: string) => {
    if (onDateChange) {
      onDateChange(date);
    } else {
      setInternalDate(date);
    }
  };

  const statusTheme = (status: string) => {
    switch (status) {
      case "finished":
        return "bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800";
      case "live":
        return "bg-red-50 text-red-800 border-red-100 dark:bg-red-900/30 dark:text-red-100 dark:border-red-800";
      case "cancelled":
        return "bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-900/30 dark:text-rose-100 dark:border-rose-800";
      default:
        return "bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-900/30 dark:text-blue-100 dark:border-blue-800";
    }
  };

  return (
    <div className="space-y-6">
      {leagueEnded && (
        <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          No upcoming matches. Season has ended.
        </div>
      )}
      {/* Date Slider */}
      <DateSlider
        dates={sortedDates}
        selectedDate={resolvedDate}
        onDateChange={handleDateChange}
      />

      {/* Matches List */}
      <div className="space-y-4">
        {currentMatches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            No scheduled matches for this date.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 max-w-3xl mx-auto">
            {currentMatches.map((match) => {
              const isFinished = match.status === "finished";
              const homeWin = isFinished && (match.home_score || 0) > (match.away_score || 0);
              const awayWin = isFinished && (match.away_score || 0) > (match.home_score || 0);

              return (
                <div
                  key={match.id}
                  className="bg-card border rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 group"
                >
                  {/* Match Header */}
                  <div
                    className={cn(
                      "px-4 py-2 flex items-center justify-between text-xs font-semibold border-b",
                      statusTheme(match.status)
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatKstTime(match.match_date)}
                      </span>
                      {match.match_sequence && (
                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] border">
                          {match.match_sequence}
                        </span>
                      )}
                    </div>
                    <div>{getStatusBadge(match.status)}</div>
                  </div>

                  {/* Match Content */}
                  <div className="p-4 md:p-6">
                    <div className="flex items-center justify-between gap-4 md:gap-8">
                      {/* Home Team */}
                      <div className="flex-1 flex flex-col items-center gap-2 text-center">
                        <Link
                          href={`/teams/${match.home_team.id}`}
                          className="hover:opacity-80 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderTeamLogo(match.home_team)}
                        </Link>
                        <div className="space-y-1">
                          <Link
                            href={`/teams/${match.home_team.id}`}
                            className="font-bold text-sm md:text-base hover:underline block truncate max-w-[100px] md:max-w-[150px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {match.home_team.name}
                          </Link>
                          {isFinished && (
                            <div className={cn("text-2xl md:text-3xl font-bold font-mono", homeWin ? "text-primary" : "text-muted-foreground")}>
                              {match.home_score}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* VS / Info */}
                      <div
                        className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                        onClick={() => setSelectedMatch(match)}
                      >
                        <div className="text-muted-foreground font-bold text-sm md:text-lg">VS</div>
                        <Button variant="outline" size="sm" className="h-7 text-xs">
                          View Details
                        </Button>
                      </div>

                      {/* Away Team */}
                      <div className="flex-1 flex flex-col items-center gap-2 text-center">
                        <Link
                          href={`/teams/${match.away_team.id}`}
                          className="hover:opacity-80 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {renderTeamLogo(match.away_team)}
                        </Link>
                        <div className="space-y-1">
                          <Link
                            href={`/teams/${match.away_team.id}`}
                            className="font-bold text-sm md:text-base hover:underline block truncate max-w-[100px] md:max-w-[150px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {match.away_team.name}
                          </Link>
                          {isFinished && (
                            <div className={cn("text-2xl md:text-3xl font-bold font-mono", awayWin ? "text-primary" : "text-muted-foreground")}>
                              {match.away_score}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Game Password (Scheduled only) */}
                    {match.game_password && match.status === "scheduled" && (
                      <div className="mt-4 pt-4 border-t flex justify-center">
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-800">
                          <Key className="h-3 w-3 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                            Password: <code className="font-mono font-bold">{match.game_password}</code>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Detail Dialog */}
      {selectedMatch && (
        <MatchDetailDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
