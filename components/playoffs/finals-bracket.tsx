"use client";

import { cn } from "@/lib/utils";
import { Trophy } from "lucide-react";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
}

interface PlayoffSeries {
  id: string;
  round_number: number;
  series_number: number;
  team1: Team | null;
  team2: Team | null;
  team1_seed: number | null;
  team2_seed: number | null;
  team1_wins: number;
  team2_wins: number;
  winner_id: string | null;
  series_format: "BO1" | "BO3" | "BO5" | "BO7";
  status: "pending" | "ongoing" | "completed";
}

interface FinalsBracketProps {
  westSeries: PlayoffSeries[];
  eastSeries: PlayoffSeries[];
  finalsSeries: PlayoffSeries | null;
}

export function FinalsBracket({
  westSeries,
  eastSeries,
  finalsSeries,
}: FinalsBracketProps) {
  // Get conference champions (round 3 winners)
  const westFinals = westSeries.find((s) => s.round_number === 3);
  const eastFinals = eastSeries.find((s) => s.round_number === 3);

  const westChampion = westFinals?.winner_id
    ? westFinals.team1?.id === westFinals.winner_id
      ? westFinals.team1
      : westFinals.team2
    : null;

  const eastChampion = eastFinals?.winner_id
    ? eastFinals.team1?.id === eastFinals.winner_id
      ? eastFinals.team1
      : eastFinals.team2
    : null;

  const ConferenceCard = ({
    conference,
    team,
    isWinner,
  }: {
    conference: "West" | "East";
    team: Team | null;
    isWinner: boolean;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-center space-x-2">
        <Trophy
          className={cn(
            "h-5 w-5",
            conference === "West" ? "text-red-500" : "text-blue-500"
          )}
        />
        <h3 className="text-lg font-bold">
          {conference === "West" ? "Western Conference" : "Eastern Conference"}
        </h3>
      </div>
      <div
        className={cn(
          "border rounded-lg p-6 bg-background/60 min-w-[220px]",
          isWinner && "bg-yellow-500/10 border-yellow-500"
        )}
      >
        {team ? (
          <div className="flex flex-col items-center space-y-3">
            {team.logo_url && (
              <img
                  src={team.logo_url}
                  alt={team.name}
                  className="h-16 w-16 object-contain"
                  loading="lazy"
                  decoding="async"
                />
            )}
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">
                {conference} Champion
              </div>
              <div className="font-bold text-lg">{team.name}</div>
            </div>
            {isWinner && (
              <Trophy className="h-6 w-6 text-yellow-500 animate-pulse" />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 text-muted-foreground italic">
            <div className="h-16 w-16 rounded-full border-2 border-dashed border-muted flex items-center justify-center">
              <Trophy className="h-8 w-8 opacity-30" />
            </div>
            <div className="text-center">
              <div className="text-sm mb-1">{conference} Champion</div>
              <div className="font-medium">TBD</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const FinalsSeriesCard = ({ series }: { series: PlayoffSeries }) => {
    const maxWins =
      series.series_format === "BO7"
        ? 4
        : series.series_format === "BO5"
        ? 3
        : series.series_format === "BO1"
        ? 1
        : 2;
    const isCompleted = series.status === "completed";

    return (
      <div className="border rounded-lg p-6 bg-background/80 min-w-[280px]">
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-500" />
              <h3 className="text-xl font-bold">Championship Finals</h3>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <span>
                {series.series_format} (first to {maxWins})
              </span>
              {isCompleted && (
                <span className="text-green-500 font-semibold">Completed</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Team 1 */}
            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border-2",
                series.winner_id === series.team1?.id &&
                  "bg-yellow-500/10 border-yellow-500"
              )}
            >
              <div className="flex items-center space-x-3">
                {series.team1?.logo_url && (
                  <img
                      src={series.team1.logo_url}
                      alt={series.team1.name}
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                )}
                <span
                  className={cn(
                    "text-base font-semibold",
                    !series.team1 && "text-muted-foreground italic"
                  )}
                >
                  {series.team1?.name || "West Champion"}
                </span>
              </div>
              <span className="text-2xl font-bold">{series.team1_wins}</span>
            </div>

            {/* Team 2 */}
            <div
              className={cn(
                "flex items-center justify-between p-4 rounded-lg border-2",
                series.winner_id === series.team2?.id &&
                  "bg-yellow-500/10 border-yellow-500"
              )}
            >
              <div className="flex items-center space-x-3">
                {series.team2?.logo_url && (
                  <img
                      src={series.team2.logo_url}
                      alt={series.team2.name}
                      className="h-8 w-8 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                )}
                <span
                  className={cn(
                    "text-base font-semibold",
                    !series.team2 && "text-muted-foreground italic"
                  )}
                >
                  {series.team2?.name || "East Champion"}
                </span>
              </div>
              <span className="text-2xl font-bold">{series.team2_wins}</span>
            </div>
          </div>

          {series.status === "ongoing" && !isCompleted && (
            <div className="text-center text-sm text-primary font-semibold animate-pulse">
              Series in progress
            </div>
          )}

          {isCompleted && series.winner_id && (
            <div className="text-center space-y-2 py-3 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
              <Trophy className="h-8 w-8 text-yellow-500 mx-auto" />
              <div className="text-sm font-bold text-yellow-500">
                LEAGUE CHAMPION
              </div>
              <div className="text-lg font-bold">
                {series.winner_id === series.team1?.id
                  ? series.team1?.name
                  : series.team2?.name}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const hasFinalsData = finalsSeries || westChampion || eastChampion;

  return (
    <div className="max-w-7xl mx-auto py-8">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-3">
            <Trophy className="h-10 w-10 text-yellow-500" />
            <h2 className="text-3xl font-bold">Championship Finals</h2>
            <Trophy className="h-10 w-10 text-yellow-500" />
          </div>
          <p className="text-muted-foreground">
            The ultimate showdown between conference champions
          </p>
        </div>

        {hasFinalsData ? (
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
            {/* Western Conference Champion */}
            <ConferenceCard
              conference="West"
              team={westChampion}
              isWinner={
                finalsSeries?.winner_id === westChampion?.id &&
                finalsSeries?.status === "completed"
              }
            />

            {/* VS Divider or Finals Series */}
            <div className="flex items-center justify-center">
              {finalsSeries ? (
                <FinalsSeriesCard series={finalsSeries} />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">VS</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Series not started
                  </span>
                </div>
              )}
            </div>

            {/* Eastern Conference Champion */}
            <ConferenceCard
              conference="East"
              team={eastChampion}
              isWinner={
                finalsSeries?.winner_id === eastChampion?.id &&
                finalsSeries?.status === "completed"
              }
            />
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center space-y-4 max-w-md">
              <Trophy className="h-20 w-20 mx-auto text-muted-foreground/30" />
              <div className="space-y-2">
                <p className="text-lg font-semibold">
                  Championship Finals Not Yet Determined
                </p>
                <p className="text-sm text-muted-foreground">
                  Complete the Conference Finals to determine the championship
                  matchup.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        {hasFinalsData && (
          <div className="text-center space-y-2 pt-8 border-t">
            <p className="text-sm text-muted-foreground">
              {finalsSeries
                ? `The championship series is played in a ${finalsSeries.series_format} format.`
                : "The championship series will begin once both conference champions are determined."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
