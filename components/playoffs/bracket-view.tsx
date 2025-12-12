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

interface BracketViewProps {
  series: PlayoffSeries[];
  conference: "West" | "East";
}

export function BracketView({ series, conference }: BracketViewProps) {
  const playIn = series.filter((s) => s.round_number === 0);
  const round1 = series.filter((s) => s.round_number === 1);
  const round2 = series.filter((s) => s.round_number === 2);
  const round3 = series.filter((s) => s.round_number === 3);
  const round4 = series.filter((s) => s.round_number === 4);

  const SeriesCard = ({ s }: { s: PlayoffSeries }) => {
    const maxWins =
      s.series_format === "BO7"
        ? 4
        : s.series_format === "BO5"
        ? 3
        : s.series_format === "BO1"
        ? 1
        : 2;
    const isCompleted = s.status === "completed";

    return (
      <div
        className={cn(
          "border rounded-lg p-3 space-y-2 min-w-[200px] bg-background/60",
          isCompleted && "bg-muted/60"
        )}
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {s.series_format} (first to {maxWins})
          </span>
          {isCompleted && <Trophy className="h-3 w-3 text-yellow-500" />}
        </div>

        {/* Team 1 */}
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded border",
            s.winner_id === s.team1?.id && "bg-green-500/10 border-green-500"
          )}
        >
          <div className="flex items-center space-x-2">
            {s.team1_seed && (
              <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                {s.team1_seed}
              </span>
            )}
            {s.team1?.logo_url && (
              <img
                src={s.team1.logo_url}
                alt={s.team1.name}
                className="h-5 w-5 object-contain"
              />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                !s.team1 && "text-muted-foreground italic"
              )}
            >
              {s.team1?.name || "TBD"}
            </span>
          </div>
          <span className="font-bold">{s.team1_wins}</span>
        </div>

        {/* Team 2 */}
        <div
          className={cn(
            "flex items-center justify-between p-2 rounded border",
            s.winner_id === s.team2?.id && "bg-green-500/10 border-green-500"
          )}
        >
          <div className="flex items-center space-x-2">
            {s.team2_seed && (
              <span className="text-xs font-bold text-muted-foreground w-5 text-right">
                {s.team2_seed}
              </span>
            )}
            {s.team2?.logo_url && (
              <img
                src={s.team2.logo_url}
                alt={s.team2.name}
                className="h-5 w-5 object-contain"
              />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                !s.team2 && "text-muted-foreground italic"
              )}
            >
              {s.team2?.name || "TBD"}
            </span>
          </div>
          <span className="font-bold">{s.team2_wins}</span>
        </div>

        {s.status === "ongoing" && !isCompleted && (
          <div className="text-xs text-center text-primary">In progress</div>
        )}
      </div>
    );
  };

  const renderRound = (title: string, data: PlayoffSeries[]) => (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-center text-muted-foreground">
        {title}
      </h3>
      {data.length > 0 ? (
        data.map((s) => <SeriesCard key={s.id} s={s} />)
      ) : (
        <p className="text-xs text-muted-foreground text-center">No series yet.</p>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-center space-x-2 py-3 rounded-lg border bg-muted/50">
        <Trophy
          className={cn(
            "h-5 w-5",
            conference === "West" ? "text-red-500" : "text-blue-500"
          )}
        />
        <h2 className="text-xl font-bold">
          {conference === "West" ? "Western Conference" : "Eastern Conference"}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {playIn.length > 0 && renderRound("Play-In", playIn)}
        {renderRound("Quarterfinals (Round 1)", round1)}
        {renderRound("Semifinals (Round 2)", round2)}
        {renderRound("Conference Finals", round3)}
        {round4.length > 0 && renderRound("Finals", round4)}
      </div>

      {series.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          Bracket is empty. Create or edit it from the admin panel.
        </div>
      )}
    </div>
  );
}
