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
  series_format: "BO3" | "BO5";
  status: "pending" | "ongoing" | "completed";
}

interface BracketViewProps {
  series: PlayoffSeries[];
  conference: "West" | "East";
}

export function BracketView({ series, conference }: BracketViewProps) {
  const conferenceColor = conference === "West" ? "red" : "blue";

  // Group series by round
  const round1 = series.filter((s) => s.round_number === 1);
  const round2 = series.filter((s) => s.round_number === 2);
  const round3 = series.filter((s) => s.round_number === 3);
  const round4 = series.filter((s) => s.round_number === 4);

  const SeriesCard = ({ s }: { s: PlayoffSeries }) => {
    const maxWins = s.series_format === "BO3" ? 2 : 3;
    const isCompleted = s.status === "completed";

    return (
      <div
        className={cn(
          "border rounded-lg p-3 space-y-2 min-w-[200px]",
          isCompleted && "bg-muted/50"
        )}
      >
        {/* Series Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {s.series_format} (First to {maxWins})
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
              <span className="text-xs font-bold text-muted-foreground w-4">
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
              <span className="text-xs font-bold text-muted-foreground w-4">
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

        {/* Status */}
        {!isCompleted && s.status === "ongoing" && (
          <div className="text-xs text-center text-primary">경기 중</div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Conference Header */}
      <div
        className={cn(
          "flex items-center justify-center space-x-2 py-3 rounded-lg border-2",
          conferenceColor === "red"
            ? "border-red-500/50 bg-red-500/10"
            : "border-blue-500/50 bg-blue-500/10"
        )}
      >
        <Trophy
          className={cn(
            "h-5 w-5",
            conferenceColor === "red" ? "text-red-500" : "text-blue-500"
          )}
        />
        <h2
          className={cn(
            "text-xl font-bold",
            conferenceColor === "red" ? "text-red-500" : "text-blue-500"
          )}
        >
          {conference === "West" ? "서부 컨퍼런스" : "동부 컨퍼런스"}
        </h2>
      </div>

      {/* Bracket Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Round 1: 8강 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-center text-muted-foreground">
            8강 (Round 1)
          </h3>
          {round1.map((s) => (
            <SeriesCard key={s.id} s={s} />
          ))}
        </div>

        {/* Round 2: 4강 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-center text-muted-foreground">
            4강 (Round 2)
          </h3>
          {round2.map((s) => (
            <SeriesCard key={s.id} s={s} />
          ))}
        </div>

        {/* Round 3: Conference Finals */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-center text-muted-foreground">
            컨퍼런스 결승
          </h3>
          {round3.map((s) => (
            <SeriesCard key={s.id} s={s} />
          ))}
        </div>

        {/* Round 4: Championship (if applicable) */}
        {round4.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-center text-muted-foreground">
              챔피언십
            </h3>
            {round4.map((s) => (
              <SeriesCard key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {series.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          플레이오프 브라켓이 아직 생성되지 않았습니다.
        </div>
      )}
    </div>
  );
}
