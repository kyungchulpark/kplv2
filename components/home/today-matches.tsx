"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin } from "lucide-react";
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
    conference: string;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string;
  };
}

interface TodayMatchesProps {
  matches: Match[];
  isToday: boolean;
}

export function TodayMatches({ matches, isToday }: TodayMatchesProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "live":
        return (
          <Badge className="bg-red-500 animate-pulse">
            <span className="relative flex h-2 w-2 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            LIVE
          </Badge>
        );
      case "finished":
        return <Badge variant="secondary">종료</Badge>;
      case "scheduled":
        return <Badge variant="outline">예정</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소</Badge>;
      default:
        return null;
    }
  };

  const formatMatchTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatMatchDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">
            {isToday ? "오늘의 경기" : "최근 경기"}
          </h2>
          <p className="text-muted-foreground">
            {isToday
              ? "오늘 예정된 경기를 확인하세요"
              : "최근 종료된 경기 결과입니다"}
          </p>
        </div>
        <Link
          href="/schedule"
          className="text-sm text-primary hover:underline flex items-center"
        >
          전체 일정 보기
          <span className="ml-1">→</span>
        </Link>
      </div>

      {matches.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">
                {isToday ? "오늘 예정된 경기가 없습니다" : "표시할 경기가 없습니다"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Link key={match.id} href={`/matches/${match.id}`}>
              <Card className="group hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatMatchTime(match.match_date)}</span>
                    </div>
                    {getStatusBadge(match.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Teams */}
                  <div className="space-y-3">
                    {/* Home Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {match.home_team.logo_url ? (
                          <img
                            src={match.home_team.logo_url}
                            alt={match.home_team.name}
                            className="h-10 w-10 object-contain"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-nba-red flex items-center justify-center text-sm font-bold text-white">
                            {match.home_team.name.substring(0, 2)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {match.home_team.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.home_team.conference}
                          </p>
                        </div>
                      </div>
                      {match.status === "finished" && (
                        <div
                          className={cn(
                            "text-2xl font-bold min-w-[2rem] text-right",
                            match.home_score! > match.away_score!
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {match.home_score}
                        </div>
                      )}
                    </div>

                    {/* VS or Dash */}
                    <div className="flex items-center justify-center">
                      <div className="h-px w-full bg-border"></div>
                      <span className="px-3 text-xs text-muted-foreground">
                        VS
                      </span>
                      <div className="h-px w-full bg-border"></div>
                    </div>

                    {/* Away Team */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        {match.away_team.logo_url ? (
                          <img
                            src={match.away_team.logo_url}
                            alt={match.away_team.name}
                            className="h-10 w-10 object-contain"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-nba-red flex items-center justify-center text-sm font-bold text-white">
                            {match.away_team.name.substring(0, 2)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {match.away_team.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {match.away_team.conference}
                          </p>
                        </div>
                      </div>
                      {match.status === "finished" && (
                        <div
                          className={cn(
                            "text-2xl font-bold min-w-[2rem] text-right",
                            match.away_score! > match.home_score!
                              ? "text-primary"
                              : "text-muted-foreground"
                          )}
                        >
                          {match.away_score}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  {!isToday && (
                    <div className="flex items-center justify-center text-xs text-muted-foreground pt-2 border-t">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatMatchDate(match.match_date)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
