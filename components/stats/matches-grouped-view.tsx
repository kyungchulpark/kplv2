"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateSlider } from "@/components/schedule/date-slider";
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Match = {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  match_sequence: string | null;
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

type StatusConfig = {
  label: string;
  variant: "outline" | "secondary" | "destructive" | "default";
};

interface MatchesGroupedViewProps {
  groupedMatches: Record<string, Match[]>;
  sortedDates: string[];
  initialSelectedDate: string;
  statusCopy: Record<Match["status"], StatusConfig>;
}

export function MatchesGroupedView({
  groupedMatches,
  sortedDates,
  initialSelectedDate,
  statusCopy,
}: MatchesGroupedViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialSelectedDate);

  useEffect(() => {
    if (initialSelectedDate) {
      setSelectedDate(initialSelectedDate);
    }
  }, [initialSelectedDate]);

  const currentMatches = selectedDate ? groupedMatches[selectedDate] || [] : [];

  if (sortedDates.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-2">
          <p className="text-lg font-semibold">No Matches Available</p>
          <p className="text-sm text-muted-foreground">
            Check the admin panel to verify match results submission status.
          </p>
        </CardContent>
      </Card>
    );
  }

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
          <Card className="border-dashed">
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-lg font-semibold">No Matches on This Date</p>
              <p className="text-sm text-muted-foreground">
                Select a different date to view available matches.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {currentMatches.map((match) => {
              const matchDate = new Date(match.match_date);
              const status = statusCopy[match.status];
              return (
                <Card
                  key={match.id}
                  className="border-2 hover:border-emerald-500 transition-colors"
                >
                  <CardContent className="p-6 space-y-4">
                    {/* Match Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{matchDate.toLocaleDateString("en-US")}</span>
                        <Clock className="h-4 w-4 ml-2" />
                        <span>
                          {matchDate.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>

                    {/* Match Sequence */}
                    {match.match_sequence && (
                      <code className="text-xs rounded bg-muted px-2 py-1 text-muted-foreground block w-fit">
                        {match.match_sequence}
                      </code>
                    )}

                    {/* Teams */}
                    <div className="flex items-center justify-between gap-3">
                      <TeamBadge team={match.home_team} align="right" />
                      <span className="text-sm text-muted-foreground font-semibold">vs</span>
                      <TeamBadge team={match.away_team} />
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end pt-2">
                      <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href={`/stats/upload/${match.id}`}>
                          Submit Result
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamBadge({
  team,
  align = "left",
}: {
  team: Match["home_team"];
  align?: "left" | "right";
}) {
  const getBorderColor = (conference: string | null) => {
    if (conference === "West") return "border-red-500";
    if (conference === "East") return "border-blue-500";
    return "border-gray-300";
  };

  const getTextColor = (conference: string | null) => {
    if (conference === "West") return "text-red-600";
    if (conference === "East") return "text-blue-600";
    return "text-foreground";
  };

  return (
    <div
      className={`flex items-center gap-3 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          className={cn(
            "h-10 w-10 rounded-lg border-2 object-contain bg-white",
            getBorderColor(team.conference)
          )}
        />
      ) : (
        <div
          className={cn(
            "h-10 w-10 rounded-lg border-2 bg-emerald-600 text-white flex items-center justify-center font-bold text-sm",
            getBorderColor(team.conference)
          )}
        >
          {team.name.substring(0, 2)}
        </div>
      )}
      <div>
        <p className={cn("text-sm font-semibold", getTextColor(team.conference))}>
          {team.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {align === "right" ? "HOME" : "AWAY"}
        </p>
      </div>
    </div>
  );
}
