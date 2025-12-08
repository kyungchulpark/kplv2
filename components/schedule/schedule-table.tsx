"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, Clock, Key } from "lucide-react";
import { MatchDetailDialog } from "./match-detail-dialog";

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
  const [hidePrevious, setHidePrevious] = useState(false);
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
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Filter past matches if toggle is on
  const today = startOfDay(new Date());
  const filteredDates = hidePrevious
    ? sortedDates.filter((date) => !isBefore(parseISO(date), today))
    : sortedDates;

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
          className="h-8 w-8 object-contain"
        />
      );
    }
    return (
      <div className="h-8 w-8 rounded bg-nba-red flex items-center justify-center text-xs font-bold text-white">
        {team.name.substring(0, 2)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toggle Previous Games */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setHidePrevious(!hidePrevious)}
        >
          {hidePrevious ? "모든 경기 보기" : "이전 경기 숨기기"}
        </Button>
      </div>

      {/* Schedule Table */}
      <div className="space-y-6">
        {filteredDates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            경기 일정이 없습니다
          </div>
        ) : (
          filteredDates.map((date) => {
            const dateMatches = groupedMatches[date].sort((a, b) => {
              const timeA = new Date(a.match_date).getTime();
              const timeB = new Date(b.match_date).getTime();
              return timeA - timeB;
            });

            return (
              <div key={date} className="space-y-3">
                {/* Date Header */}
                <div className="flex items-center space-x-2 border-b pb-2">
                  <Calendar className="h-4 w-4 text-nba-red" />
                  <h3 className="text-lg font-bold">
                    {format(parseISO(date), "EEEE, MMM d", { locale: ko })}
                  </h3>
                  <span className="text-sm text-muted-foreground">
                    ({dateMatches.length}경기)
                  </span>
                </div>

                {/* Matches for this date */}
                <div className="space-y-2">
                  {dateMatches.map((match) => {
                    const isHomeGame = true; // You can add logic to determine this
                    const vsText = isHomeGame ? "vs" : "@";

                    return (
                      <div
                        key={match.id}
                        className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => setSelectedMatch(match)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Time */}
                          <div className="flex items-center space-x-2 min-w-[80px]">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {format(parseISO(match.match_date), "HH:mm")}
                            </span>
                          </div>

                          {/* Matchup */}
                          <div className="flex items-center space-x-4 flex-1">
                            {/* Home Team */}
                            <div className="flex items-center space-x-3 flex-1 justify-end">
                              <span className="text-sm font-semibold">
                                {match.home_team.name}
                              </span>
                              {renderTeamLogo(match.home_team)}
                            </div>

                            {/* VS/@ */}
                            <span className="text-xs text-muted-foreground font-medium min-w-[24px] text-center">
                              {vsText}
                            </span>

                            {/* Away Team */}
                            <div className="flex items-center space-x-3 flex-1">
                              {renderTeamLogo(match.away_team)}
                              <span className="text-sm font-semibold">
                                {match.away_team.name}
                              </span>
                            </div>
                          </div>

                          {/* Score or Status */}
                          <div className="flex items-center space-x-3 min-w-[120px] justify-end">
                            {match.status === "finished" ? (
                              <div className="text-right">
                                <span className="text-lg font-bold">
                                  {match.home_score} - {match.away_score}
                                </span>
                              </div>
                            ) : (
                              getStatusBadge(match.status)
                            )}
                          </div>

                          {match.match_sequence && (
                            <div className="hidden md:block">
                              <code className="text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground">
                                {match.match_sequence}
                              </code>
                            </div>
                          )}

                          {/* Game Password - 예정된 경기에만 표시 */}
                          {match.game_password && match.status === "scheduled" && (
                            <div className="flex items-center space-x-1">
                              <Key className="h-3 w-3 text-green-600" />
                              <code className="text-xs font-mono bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded text-green-700 dark:text-green-400">
                                {match.game_password}
                              </code>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Match Detail Dialog */}
      {selectedMatch && (
        <MatchDetailDialog
          matchId={selectedMatch.id}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
