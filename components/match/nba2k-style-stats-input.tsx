"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";

interface PlayerStats {
  player_id: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  fls: number;
  turnovers: number;
  fgm: number;
  fga: number;
  three_pm: number;
  three_pa: number;
  ftm: number;
  fta: number;
}

interface RosterPlayer {
  player_id: string;
  psn_id: string;
}

interface NBA2KStyleStatsInputProps {
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeRoster: RosterPlayer[];
  awayRoster: RosterPlayer[];
  initialHomeStats?: PlayerStats[];
  initialAwayStats?: PlayerStats[];
  onSubmit: (data: {
    homeScore: number;
    awayScore: number;
    homeStats: PlayerStats[];
    awayStats: PlayerStats[];
  }) => Promise<void>;
}

const emptyStats = (): Omit<PlayerStats, "player_id"> => ({
  pts: 0,
  reb: 0,
  ast: 0,
  stl: 0,
  blk: 0,
  fls: 0,
  turnovers: 0,
  fgm: 0,
  fga: 0,
  three_pm: 0,
  three_pa: 0,
  ftm: 0,
  fta: 0,
});

const buildInitialStats = (initial?: PlayerStats[]): PlayerStats[] => {
  const makeEmpty = (): PlayerStats => ({ player_id: "", ...emptyStats() });
  if (!initial || initial.length === 0) {
    return Array(5)
      .fill(null)
      .map(() => makeEmpty());
  }

  const seeded = initial.slice(0, 5).map((stat) => ({
    ...makeEmpty(),
    ...stat,
    player_id: stat.player_id || "",
  }));

  while (seeded.length < 5) {
    seeded.push(makeEmpty());
  }

  return seeded;
};

export function NBA2KStyleStatsInput({
  homeTeam,
  awayTeam,
  homeRoster,
  awayRoster,
  initialHomeStats,
  initialAwayStats,
  onSubmit,
}: NBA2KStyleStatsInputProps) {
  // Swappable team positions
  const [topTeamIsAway, setTopTeamIsAway] = useState(true);

  // Stats arrays (5 players each)
  const [homeStats, setHomeStats] = useState<PlayerStats[]>(() =>
    buildInitialStats(initialHomeStats)
  );
  const [awayStats, setAwayStats] = useState<PlayerStats[]>(() =>
    buildInitialStats(initialAwayStats)
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate team scores from PTS (auto-calculate)
  const homeScore = homeStats.reduce((sum, s) => sum + s.pts, 0);
  const awayScore = awayStats.reduce((sum, s) => sum + s.pts, 0);

  const topTeam = topTeamIsAway ? awayTeam : homeTeam;
  const bottomTeam = topTeamIsAway ? homeTeam : awayTeam;
  const topRoster = topTeamIsAway ? awayRoster : homeRoster;
  const bottomRoster = topTeamIsAway ? homeRoster : awayRoster;
  const topStats = topTeamIsAway ? awayStats : homeStats;
  const bottomStats = topTeamIsAway ? homeStats : awayStats;
  const setTopStats = topTeamIsAway ? setAwayStats : setHomeStats;
  const setBottomStats = topTeamIsAway ? setHomeStats : setAwayStats;
  const topScore = topTeamIsAway ? awayScore : homeScore;
  const bottomScore = topTeamIsAway ? homeScore : awayScore;

  const handleSwap = () => {
    setTopTeamIsAway(!topTeamIsAway);
  };

  const updateStat = (
    isTop: boolean,
    index: number,
    field: keyof PlayerStats,
    value: string | number
  ) => {
    const stats = isTop ? [...topStats] : [...bottomStats];
    const setter = isTop ? setTopStats : setBottomStats;

    if (field === "player_id") {
      stats[index] = { ...stats[index], player_id: value as string };
    } else {
      const numValue = typeof value === "string" ? parseInt(value) || 0 : value;
      stats[index] = { ...stats[index], [field]: numValue };
    }

    setter(stats);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        homeScore,
        awayScore,
        homeStats: homeStats.filter((s) => s.player_id),
        awayStats: awayStats.filter((s) => s.player_id),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Swap Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Match Stats Input</h2>
        <Button variant="outline" size="sm" onClick={handleSwap}>
          <ArrowUpDown className="mr-2 h-4 w-4" />
          Swap Home/Away
        </Button>
      </div>

      {/* Top Team (Away or Home depending on swap) */}
      <TeamStatsSection
        team={topTeam}
        roster={topRoster}
        stats={topStats}
        score={topScore}
        onStatChange={(index, field, value) =>
          updateStat(true, index, field, value)
        }
        label={topTeamIsAway ? "Away Team (AWAY)" : "Home Team (HOME)"}
      />

      {/* Bottom Team (Home or Away depending on swap) */}
      <TeamStatsSection
        team={bottomTeam}
        roster={bottomRoster}
        stats={bottomStats}
        score={bottomScore}
        onStatChange={(index, field, value) =>
          updateStat(false, index, field, value)
        }
        label={topTeamIsAway ? "Home Team (HOME)" : "Away Team (AWAY)"}
      />

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          size="lg"
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700"
        >
          {isSubmitting ? "Saving..." : "Save Match Results"}
        </Button>
      </div>
    </div>
  );
}

interface TeamStatsSectionProps {
  team: { id: string; name: string };
  roster: RosterPlayer[];
  stats: PlayerStats[];
  score: number;
  label: string;
  onStatChange: (
    index: number,
    field: keyof PlayerStats,
    value: string | number
  ) => void;
}

function TeamStatsSection({
  team,
  roster,
  stats,
  score,
  label,
  onStatChange,
}: TeamStatsSectionProps) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <h3 className="text-lg font-bold">{team.name}</h3>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Team Score (Auto-calculated)</div>
          <div className="text-3xl font-bold text-emerald-600">{score}</div>
        </div>
      </div>

      {/* Stats Table - Desktop */}
      <div className="hidden md:block overflow-x-auto w-full">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-semibold">#</th>
              <th className="text-left p-2 font-semibold min-w-[150px]">Player</th>
              <th className="text-center p-2 font-semibold">PTS</th>
              <th className="text-center p-2 font-semibold">REB</th>
              <th className="text-center p-2 font-semibold">AST</th>
              <th className="text-center p-2 font-semibold">STL</th>
              <th className="text-center p-2 font-semibold">BLK</th>
              <th className="text-center p-2 font-semibold">FLS</th>
              <th className="text-center p-2 font-semibold">TO</th>
              <th className="text-center p-2 font-semibold">FGM/FGA</th>
              <th className="text-center p-2 font-semibold">3PM/3PA</th>
              <th className="text-center p-2 font-semibold">FTM/FTA</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((playerStat, index) => (
              <tr key={index} className="border-b hover:bg-muted/30">
                <td className="p-2 text-center text-muted-foreground">
                  {index + 1}
                </td>
                <td className="p-2">
                  <Select
                    value={playerStat.player_id}
                    onValueChange={(value) =>
                      onStatChange(index, "player_id", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Player" />
                    </SelectTrigger>
                    <SelectContent>
                      {roster.map((player) => (
                        <SelectItem key={player.player_id} value={player.player_id}>
                          {player.psn_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <StatInput
                  value={playerStat.pts}
                  onChange={(v) => onStatChange(index, "pts", v)}
                />
                <StatInput
                  value={playerStat.reb}
                  onChange={(v) => onStatChange(index, "reb", v)}
                />
                <StatInput
                  value={playerStat.ast}
                  onChange={(v) => onStatChange(index, "ast", v)}
                />
                <StatInput
                  value={playerStat.stl}
                  onChange={(v) => onStatChange(index, "stl", v)}
                />
                <StatInput
                  value={playerStat.blk}
                  onChange={(v) => onStatChange(index, "blk", v)}
                />
                <StatInput
                  value={playerStat.fls}
                  onChange={(v) => onStatChange(index, "fls", v)}
                />
                <StatInput
                  value={playerStat.turnovers}
                  onChange={(v) => onStatChange(index, "turnovers", v)}
                />
                <td className="p-2">
                  <div className="flex items-center gap-1 justify-center">
                    <Input
                      type="number"
                      value={playerStat.fgm === 0 ? "" : playerStat.fgm}
                      onChange={(e) =>
                        onStatChange(index, "fgm", e.target.value)
                      }
                      className="w-16 text-center"
                      placeholder="0"
                      min={0}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      value={playerStat.fga === 0 ? "" : playerStat.fga}
                      onChange={(e) =>
                        onStatChange(index, "fga", e.target.value)
                      }
                      className="w-16 text-center"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 justify-center">
                    <Input
                      type="number"
                      value={playerStat.three_pm === 0 ? "" : playerStat.three_pm}
                      onChange={(e) =>
                        onStatChange(index, "three_pm", e.target.value)
                      }
                      className="w-16 text-center"
                      placeholder="0"
                      min={0}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      value={playerStat.three_pa === 0 ? "" : playerStat.three_pa}
                      onChange={(e) =>
                        onStatChange(index, "three_pa", e.target.value)
                      }
                      className="w-16 text-center"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 justify-center">
                    <Input
                      type="number"
                      value={playerStat.ftm === 0 ? "" : playerStat.ftm}
                      onChange={(e) =>
                        onStatChange(index, "ftm", e.target.value)
                      }
                      className="w-16 text-center"
                      placeholder="0"
                      min={0}
                    />
                    <span className="text-muted-foreground">/</span>
                    <Input
                      type="number"
                      value={playerStat.fta === 0 ? "" : playerStat.fta}
                      onChange={(e) =>
                        onStatChange(index, "fta", e.target.value)
                      }
                      className="w-16 text-center"
                      placeholder="0"
                      min={0}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats Table - Mobile (Cards) */}
      <div className="md:hidden space-y-4">
        {stats.map((playerStat, index) => (
          <div key={index} className="border rounded-lg p-3 bg-background">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold text-muted-foreground">
                #{index + 1}
              </span>
              <Select
                value={playerStat.player_id}
                onValueChange={(value) =>
                  onStatChange(index, "player_id", value)
                }
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select Player" />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((player) => (
                    <SelectItem key={player.player_id} value={player.player_id}>
                      {player.psn_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Basic Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-2">
              <MobileStatInput
                label="PTS"
                value={playerStat.pts}
                onChange={(v) => onStatChange(index, "pts", v)}
              />
              <MobileStatInput
                label="REB"
                value={playerStat.reb}
                onChange={(v) => onStatChange(index, "reb", v)}
              />
              <MobileStatInput
                label="AST"
                value={playerStat.ast}
                onChange={(v) => onStatChange(index, "ast", v)}
              />
              <MobileStatInput
                label="STL"
                value={playerStat.stl}
                onChange={(v) => onStatChange(index, "stl", v)}
              />
              <MobileStatInput
                label="BLK"
                value={playerStat.blk}
                onChange={(v) => onStatChange(index, "blk", v)}
              />
              <MobileStatInput
                label="FLS"
                value={playerStat.fls}
                onChange={(v) => onStatChange(index, "fls", v)}
              />
              <MobileStatInput
                label="TO"
                value={playerStat.turnovers}
                onChange={(v) => onStatChange(index, "turnovers", v)}
              />
            </div>

            {/* Shooting Stats */}
            <div className="space-y-2 text-sm">
              <MobileShotInput
                label="FG"
                made={playerStat.fgm}
                attempted={playerStat.fga}
                onMadeChange={(v) => onStatChange(index, "fgm", v)}
                onAttemptedChange={(v) => onStatChange(index, "fga", v)}
              />
              <MobileShotInput
                label="3P"
                made={playerStat.three_pm}
                attempted={playerStat.three_pa}
                onMadeChange={(v) => onStatChange(index, "three_pm", v)}
                onAttemptedChange={(v) => onStatChange(index, "three_pa", v)}
              />
              <MobileShotInput
                label="FT"
                made={playerStat.ftm}
                attempted={playerStat.fta}
                onMadeChange={(v) => onStatChange(index, "ftm", v)}
                onAttemptedChange={(v) => onStatChange(index, "fta", v)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper component for desktop stat input
function StatInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <td className="p-2">
      <Input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 text-center"
        placeholder="0"
        min={0}
      />
    </td>
  );
}

// Helper component for mobile stat input
function MobileStatInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value)}
        className="text-center"
        placeholder="0"
        min={0}
      />
    </div>
  );
}

// Helper component for mobile shooting stats
function MobileShotInput({
  label,
  made,
  attempted,
  onMadeChange,
  onAttemptedChange,
}: {
  label: string;
  made: number;
  attempted: number;
  onMadeChange: (value: string) => void;
  onAttemptedChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground w-8">{label}</Label>
      <Input
        type="number"
        value={made === 0 ? "" : made}
        onChange={(e) => onMadeChange(e.target.value)}
        className="flex-1 text-center"
        placeholder="0"
        min={0}
      />
      <span className="text-muted-foreground">/</span>
      <Input
        type="number"
        value={attempted === 0 ? "" : attempted}
        onChange={(e) => onAttemptedChange(e.target.value)}
        className="flex-1 text-center"
        placeholder="0"
        min={0}
      />
    </div>
  );
}
