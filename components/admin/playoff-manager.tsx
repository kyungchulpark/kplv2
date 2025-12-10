"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { BracketView } from "@/components/playoffs/bracket-view";
import {
  Pencil,
  Play,
  RefreshCcw,
  Shield,
  Trash,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SeriesTeam = {
  id: string;
  name: string;
  logo_url: string | null;
};

type PlayoffSeries = {
  id: string;
  bracket_id?: string;
  round_number: number;
  series_number: number;
  team1: SeriesTeam | null;
  team2: SeriesTeam | null;
  team1_seed: number | null;
  team2_seed: number | null;
  team1_wins: number;
  team2_wins: number;
  winner_id: string | null;
  series_format: "BO1" | "BO3" | "BO5";
  status: "pending" | "ongoing" | "completed";
};

interface PlayoffManagerProps {
  seasonId: string;
  westSeries: PlayoffSeries[];
  eastSeries: PlayoffSeries[];
  westBracketId?: string | null;
  eastBracketId?: string | null;
}

type TeamOption = {
  id: string;
  name: string;
  conference: "West" | "East" | null;
};

type Conference = "West" | "East";
type SeedMap = Record<number, string | null>;

const seedList = (includePlayIn: boolean) =>
  includePlayIn
    ? Array.from({ length: 10 }, (_, i) => i + 1)
    : Array.from({ length: 8 }, (_, i) => i + 1);

const emptySeeds = (includePlayIn: boolean): SeedMap =>
  seedList(includePlayIn).reduce((acc, seed) => ({ ...acc, [seed]: null }), {} as SeedMap);

export function PlayoffManager({
  seasonId,
  westSeries,
  eastSeries,
  westBracketId,
  eastBracketId,
}: PlayoffManagerProps) {
  const router = useRouter();
  const supabase = createClient();

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [conference, setConference] = useState<Conference>("West");
  const [includePlayIn, setIncludePlayIn] = useState(false);
  const [seedSelections, setSeedSelections] = useState<SeedMap>(
    emptySeeds(false)
  );
  const [editingSeries, setEditingSeries] = useState<
    (PlayoffSeries & { conference: Conference }) | null
  >(null);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, conference")
        .eq("season_id", seasonId)
        .order("name", { ascending: true });

      if (error) {
        toast.error(error.message);
        return;
      }
      setTeams(data as TeamOption[]);
    };
    fetchTeams();
  }, [seasonId, supabase]);

  const optionsForConference = useMemo(
    () => teams.filter((t) => t.conference === conference),
    [teams, conference]
  );

  const getOptionsFor = (conf: Conference) =>
    teams.filter((t) => t.conference === conf);

  const handleSeedChange = (seed: number, teamId: string | null) => {
    setSeedSelections((prev) => ({ ...prev, [seed]: teamId }));
  };

  const resetForm = (conf: Conference) => {
    setConference(conf);
    setIncludePlayIn(false);
    setSeedSelections(emptySeeds(false));
  };

  const validateSeeds = () => {
    const seeds = seedList(includePlayIn);
    for (const seed of seeds) {
      if (!seedSelections[seed]) {
        throw new Error(`Seed ${seed} is not assigned.`);
      }
    }
    const ids = seeds.map((s) => seedSelections[s]).filter(Boolean) as string[];
    const duplicates = ids.filter(
      (id, idx) => ids.indexOf(id) !== idx
    );
    if (duplicates.length > 0) {
      throw new Error("Each team can only be used once.");
    }
  };

  const buildSeriesPayload = (bracketId: string) => {
    const payload: any[] = [];
    const s = (seed: number) => seedSelections[seed];

    if (includePlayIn) {
      payload.push(
        {
          bracket_id: bracketId,
          round_number: 0,
          series_number: 1,
          team1_id: s(7),
          team2_id: s(8),
          team1_seed: 7,
          team2_seed: 8,
          series_format: "BO1",
          status: "pending",
        },
        {
          bracket_id: bracketId,
          round_number: 0,
          series_number: 2,
          team1_id: s(9),
          team2_id: s(10),
          team1_seed: 9,
          team2_seed: 10,
          series_format: "BO1",
          status: "pending",
        }
      );
    }

    payload.push(
      {
        bracket_id: bracketId,
        round_number: 1,
        series_number: 1,
        team1_id: s(1),
        team2_id: includePlayIn ? null : s(8),
        team1_seed: 1,
        team2_seed: 8,
        series_format: "BO3",
        status: "pending",
      },
      {
        bracket_id: bracketId,
        round_number: 1,
        series_number: 2,
        team1_id: s(4),
        team2_id: s(5),
        team1_seed: 4,
        team2_seed: 5,
        series_format: "BO3",
        status: "pending",
      },
      {
        bracket_id: bracketId,
        round_number: 1,
        series_number: 3,
        team1_id: s(2),
        team2_id: includePlayIn ? null : s(7),
        team1_seed: 2,
        team2_seed: 7,
        series_format: "BO3",
        status: "pending",
      },
      {
        bracket_id: bracketId,
        round_number: 1,
        series_number: 4,
        team1_id: s(3),
        team2_id: s(6),
        team1_seed: 3,
        team2_seed: 6,
        series_format: "BO3",
        status: "pending",
      }
    );

    // Placeholders for later rounds (admin can edit)
    payload.push(
      {
        bracket_id: bracketId,
        round_number: 2,
        series_number: 1,
        team1_id: null,
        team2_id: null,
        team1_seed: null,
        team2_seed: null,
        series_format: "BO3",
        status: "pending",
      },
      {
        bracket_id: bracketId,
        round_number: 2,
        series_number: 2,
        team1_id: null,
        team2_id: null,
        team1_seed: null,
        team2_seed: null,
        series_format: "BO3",
        status: "pending",
      },
      {
        bracket_id: bracketId,
        round_number: 3,
        series_number: 1,
        team1_id: null,
        team2_id: null,
        team1_seed: null,
        team2_seed: null,
        series_format: "BO5",
        status: "pending",
      }
    );

    return payload;
  };

  const handleCreateBracket = async () => {
    setSaving(true);
    try {
      validateSeeds();

      const bracketType = conference === "West" ? "west" : "east";
      const { data: bracket, error: upsertError } = await supabase
        .from("playoff_brackets")
        .upsert(
          {
            season_id: seasonId,
            bracket_type: bracketType,
            is_active: true,
          },
          { onConflict: "season_id,bracket_type" }
        )
        .select()
        .single();

      if (upsertError || !bracket) throw upsertError;

      await supabase.from("playoff_series").delete().eq("bracket_id", bracket.id);

      const payload = buildSeriesPayload(bracket.id);
      const { error: insertError } = await supabase
        .from("playoff_series")
        .insert(payload);
      if (insertError) throw insertError;

      toast.success(`${conference} bracket created manually.`);
      setDialogOpen(false);
      resetForm(conference);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Could not create bracket");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBracket = async (bracketId?: string | null) => {
    if (!bracketId) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("playoff_brackets")
        .delete()
        .eq("id", bracketId);
      if (error) throw error;
      toast.success("Bracket deleted");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSeries = async () => {
    if (!editingSeries) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("playoff_series")
        .update({
          round_number: editingSeries.round_number,
          series_number: editingSeries.series_number,
          team1_id: editingSeries.team1?.id || null,
          team2_id: editingSeries.team2?.id || null,
          team1_seed: editingSeries.team1_seed,
          team2_seed: editingSeries.team2_seed,
          series_format: editingSeries.series_format,
        })
        .eq("id", editingSeries.id);
      if (error) throw error;
      toast.success("Series updated");
      setEditingSeries(null);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeries = async (seriesId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("playoff_series")
        .delete()
        .eq("id", seriesId);
      if (error) throw error;
      toast.success("Series deleted");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const renderSeriesActions = (
    items: PlayoffSeries[],
    conf: Conference,
    bracketId?: string | null
  ) => (
    <div className="space-y-2">
      {items.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between rounded-md border p-3"
        >
          <div>
            <p className="font-semibold text-sm">
              Round {s.round_number} · Series {s.series_number}
            </p>
            <p className="text-sm text-muted-foreground">
              {(s.team1?.name || "TBD")} vs {(s.team2?.name || "TBD")} ·{" "}
              {s.series_format}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setEditingSeries({
                  ...s,
                  conference: conf,
                })
              }
            >
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteSeries(s.id)}
              disabled={loading}
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-sm text-muted-foreground">No series yet.</p>
      )}
      {bracketId && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => handleDeleteBracket(bracketId)}
          disabled={loading}
        >
          <Trash className="h-4 w-4 mr-2" />
          Delete bracket
        </Button>
      )}
    </div>
  );

  const conferenceBlock = (
    title: string,
    conf: Conference,
    data: PlayoffSeries[],
    bracketId?: string | null
  ) => (
    <Card>
      <CardHeader className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Shield
            className={cn(
              "h-5 w-5",
              conf === "West" ? "text-red-500" : "text-blue-500"
            )}
          />
          <CardTitle>{title}</CardTitle>
        </div>
        <CardDescription>
          Manually manage seeds, play-in games, and series assignments.
        </CardDescription>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetForm(conf);
              setDialogOpen(true);
            }}
          >
            <Play className="h-4 w-4 mr-2" />
            Create / Reseed
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.refresh()}
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <BracketView series={data} conference={conf} />
        {renderSeriesActions(data, conf, bracketId)}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Playoffs</h1>
          <p className="text-muted-foreground">
            Manual seeding, play-in policy, and bracket edits.
          </p>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {conferenceBlock("Western Conference Bracket", "West", westSeries, westBracketId)}
        {conferenceBlock("Eastern Conference Bracket", "East", eastSeries, eastBracketId)}

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manual bracket setup</DialogTitle>
            <DialogDescription>
              Pick teams for each seed. Enable play-in to create 7-10 games (BO1).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conference</Label>
                <Select
                  value={conference}
                  onValueChange={(val) => setConference(val as Conference)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="West">Western</SelectItem>
                    <SelectItem value="East">Eastern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  Enable Play-In (7-10)
                  <Switch
                    checked={includePlayIn}
                    onCheckedChange={(checked) => {
                      setIncludePlayIn(checked);
                      setSeedSelections(emptySeeds(checked));
                    }}
                  />
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-2">
              {seedList(includePlayIn).map((seed) => (
                <div key={seed} className="space-y-2">
                  <Label>Seed {seed}</Label>
                  <Select
                    value={seedSelections[seed] || ""}
                    onValueChange={(val) => handleSeedChange(seed, val || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionsForConference.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBracket} disabled={saving}>
              Save bracket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Series edit dialog */}
      <Dialog open={!!editingSeries} onOpenChange={() => setEditingSeries(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit series</DialogTitle>
            <DialogDescription>
              Adjust teams, seeds, round, and format for this matchup.
            </DialogDescription>
          </DialogHeader>
          {editingSeries && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Round</Label>
                  <Select
                    value={String(editingSeries.round_number)}
                    onValueChange={(val) =>
                      setEditingSeries({
                        ...editingSeries,
                        round_number: Number(val),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Play-In</SelectItem>
                      <SelectItem value="1">Round 1</SelectItem>
                      <SelectItem value="2">Round 2</SelectItem>
                      <SelectItem value="3">Conference Finals</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Series #</Label>
                  <Select
                    value={String(editingSeries.series_number)}
                    onValueChange={(val) =>
                      setEditingSeries({
                        ...editingSeries,
                        series_number: Number(val),
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map((num) => (
                        <SelectItem key={num} value={String(num)}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(() => {
                const editOptions = getOptionsFor(editingSeries.conference);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Team 1</Label>
                        <Select
                          value={editingSeries.team1?.id || ""}
                          onValueChange={(val) =>
                            setEditingSeries({
                              ...editingSeries,
                              team1: val
                                ? {
                                    id: val,
                                    name:
                                      editOptions.find((t) => t.id === val)?.name ||
                                      "",
                                    logo_url: editingSeries.team1?.logo_url || null,
                                  }
                                : null,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {editOptions.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Seed</Label>
                        <Select
                          value={
                            editingSeries.team1_seed
                              ? String(editingSeries.team1_seed)
                              : ""
                          }
                          onValueChange={(val) =>
                            setEditingSeries({
                              ...editingSeries,
                              team1_seed: val ? Number(val) : null,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seed" />
                          </SelectTrigger>
                          <SelectContent>
                            {seedList(true).map((seed) => (
                              <SelectItem key={seed} value={String(seed)}>
                                {seed}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Team 2</Label>
                        <Select
                          value={editingSeries.team2?.id || ""}
                          onValueChange={(val) =>
                            setEditingSeries({
                              ...editingSeries,
                              team2: val
                                ? {
                                    id: val,
                                    name:
                                      editOptions.find((t) => t.id === val)?.name ||
                                      "",
                                    logo_url: editingSeries.team2?.logo_url || null,
                                  }
                                : null,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {editOptions.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Seed</Label>
                        <Select
                          value={
                            editingSeries.team2_seed
                              ? String(editingSeries.team2_seed)
                              : ""
                          }
                          onValueChange={(val) =>
                            setEditingSeries({
                              ...editingSeries,
                              team2_seed: val ? Number(val) : null,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seed" />
                          </SelectTrigger>
                          <SelectContent>
                            {seedList(true).map((seed) => (
                              <SelectItem key={seed} value={String(seed)}>
                                {seed}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                );
              })()}

              <div className="space-y-1">
                <Label>Format</Label>
                <Select
                  value={editingSeries.series_format}
                  onValueChange={(val) =>
                    setEditingSeries({
                      ...editingSeries,
                      series_format: val as PlayoffSeries["series_format"],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BO1">BO1</SelectItem>
                    <SelectItem value="BO3">BO3</SelectItem>
                    <SelectItem value="BO5">BO5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSeries(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSeries} disabled={saving || !editingSeries}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
