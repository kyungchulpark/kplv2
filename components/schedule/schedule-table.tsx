"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { format, parseISO, isBefore, startOfDay, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, Clock, Key } from "lucide-react";
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
};

export function ScheduleTable({ matches }: ScheduleTableProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
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
    if (sortedDates.length > 0 && !selectedDate) {
      const today = startOfDay(new Date());
      const futureDate = sortedDates.find(date => !isBefore(parseISO(date), today));
      setSelectedDate(futureDate || sortedDates[sortedDates.length - 1]);
    }
  }, [sortedDates, selectedDate]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="text-xs">
            예정
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
          <Badge variant="secondary" className="text-xs">
            종료
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="text-xs">
            취소
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

  // Filter matches for selected date
  const currentMatches = selectedDate ? groupedMatches[selectedDate] || [] : [];

  return (
    <div className="space-y-6">
      {/* Date Slider */}
      <DateSlider
        dates={sortedDates}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />

      {/* Matches List */}
      <div className="space-y-4">
        {currentMatches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
            선택한 날짜에 경기 일정이 없습니다
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
                  <div className="bg-muted/30 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground border-b">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(match.match_date).toLocaleTimeString("ko-KR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
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
                          상세보기
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
                            비번: <code className="font-mono font-bold">{match.game_password}</code>
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
