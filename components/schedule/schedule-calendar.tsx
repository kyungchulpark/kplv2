"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { MatchDetailDialog } from "./match-detail-dialog";
import { cn } from "@/lib/utils";

interface Match {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
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
}

interface ScheduleCalendarProps {
  matches: Match[];
}

export function ScheduleCalendar({ matches }: ScheduleCalendarProps) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Group matches by date
  const matchesByDate = useMemo(() => {
    const grouped: Record<string, Match[]> = {};
    matches.forEach((match) => {
      const date = new Date(match.match_date).toISOString().split("T")[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(match);
    });
    return grouped;
  }, [matches]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: Array<{ date: number | null; fullDate: string | null }> = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ date: null, fullDate: null });
    }

    // Days of month
    for (let i = 1; i <= daysInMonth; i++) {
      const fullDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({ date: i, fullDate });
    }

    return days;
  }, [currentYear, currentMonth]);

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  const previousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  };

  const isToday = (date: number | null, fullDate: string | null) => {
    if (!date || !fullDate) return false;
    const today = now.toISOString().split("T")[0];
    return fullDate === today;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>{monthName}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                오늘
              </Button>
              <Button variant="outline" size="icon" onClick={previousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {["일", "월", "화", "수", "목", "금", "토"].map((day, idx) => (
              <div
                key={day}
                className={cn(
                  "text-center font-semibold text-sm py-2",
                  idx === 0 ? "text-red-500" : idx === 6 ? "text-blue-500" : ""
                )}
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((day, idx) => {
              const dayMatches = day.fullDate ? matchesByDate[day.fullDate] || [] : [];
              const hasMatches = dayMatches.length > 0;

              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[100px] border rounded-lg p-2 transition-colors",
                    day.date ? "hover:bg-accent cursor-pointer" : "bg-muted/30",
                    isToday(day.date, day.fullDate) && "border-primary border-2 bg-primary/5"
                  )}
                  onClick={() => {
                    if (dayMatches.length > 0) {
                      setSelectedMatch(dayMatches[0]);
                    }
                  }}
                >
                  {day.date && (
                    <>
                      <div className="font-semibold text-sm mb-1">{day.date}</div>
                      {hasMatches && (
                        <div className="space-y-1">
                          {dayMatches.map((match) => {
                            const matchTime = new Date(match.match_date).toLocaleTimeString("ko-KR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            });

                            return (
                              <div
                                key={match.id}
                                className="text-xs p-1 rounded bg-primary/10 hover:bg-primary/20 transition-colors"
                              >
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[10px] text-muted-foreground">{matchTime}</span>
                                  {match.status === "finished" && (
                                    <Badge variant="secondary" className="text-[8px] h-4 px-1">
                                      종료
                                    </Badge>
                                  )}
                                  {match.status === "live" && (
                                    <Badge className="text-[8px] h-4 px-1 bg-red-500 animate-pulse">
                                      LIVE
                                    </Badge>
                                  )}
                                </div>
                                <div className="font-medium truncate text-[11px]">
                                  {match.home_team.name} vs {match.away_team.name}
                                </div>
                                {match.status === "finished" && (
                                  <div className="text-[10px] font-semibold text-primary">
                                    {match.home_score} - {match.away_score}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <span className="text-muted-foreground">LIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-secondary"></div>
              <span className="text-muted-foreground">종료</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full border-2 border-primary"></div>
              <span className="text-muted-foreground">예정</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Match Detail Dialog */}
      {selectedMatch && (
        <MatchDetailDialog
          match={selectedMatch}
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
        />
      )}
    </>
  );
}
