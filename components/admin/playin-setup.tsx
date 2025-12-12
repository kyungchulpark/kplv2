"use client";

import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Shield, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type TeamOption = {
  id: string;
  name: string;
  conference: "West" | "East" | null;
};

type Conference = "West" | "East";

interface PlayInSetupProps {
  seasonId: string;
}

export function PlayInSetup({ seasonId }: PlayInSetupProps) {
  const router = useRouter();
  const supabase = createClient();

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [creating, setCreating] = useState(false);

  // Western Conference selections
  const [westTeam7, setWestTeam7] = useState<string>("");
  const [westTeam8, setWestTeam8] = useState<string>("");
  const [westTeam9, setWestTeam9] = useState<string>("");
  const [westTeam10, setWestTeam10] = useState<string>("");

  // Eastern Conference selections
  const [eastTeam7, setEastTeam7] = useState<string>("");
  const [eastTeam8, setEastTeam8] = useState<string>("");
  const [eastTeam9, setEastTeam9] = useState<string>("");
  const [eastTeam10, setEastTeam10] = useState<string>("");

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

  const westTeams = useMemo(
    () => teams.filter((t) => t.conference === "West"),
    [teams]
  );

  const eastTeams = useMemo(
    () => teams.filter((t) => t.conference === "East"),
    [teams]
  );

  const validateSelections = (
    team7: string,
    team8: string,
    team9: string,
    team10: string,
    conference: string
  ) => {
    if (!team7 || !team8 || !team9 || !team10) {
      throw new Error(`All 4 seeds must be selected for ${conference} Conference`);
    }

    const selections = [team7, team8, team9, team10];
    const duplicates = selections.filter(
      (id, idx) => selections.indexOf(id) !== idx
    );

    if (duplicates.length > 0) {
      throw new Error(`Each team can only be selected once in ${conference} Conference`);
    }
  };

  const handleCreateWestPlayIn = async () => {
    setCreating(true);
    try {
      validateSelections(
        westTeam7,
        westTeam8,
        westTeam9,
        westTeam10,
        "Western"
      );

      const { error } = await supabase.rpc("create_playin_bracket", {
        p_season_id: seasonId,
        p_conference: "west",
        p_team7_id: westTeam7,
        p_team8_id: westTeam8,
        p_team9_id: westTeam9,
        p_team10_id: westTeam10,
      });

      if (error) throw error;

      toast.success("Western Conference Play-In bracket created successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create Play-In bracket");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateEastPlayIn = async () => {
    setCreating(true);
    try {
      validateSelections(
        eastTeam7,
        eastTeam8,
        eastTeam9,
        eastTeam10,
        "Eastern"
      );

      const { error } = await supabase.rpc("create_playin_bracket", {
        p_season_id: seasonId,
        p_conference: "east",
        p_team7_id: eastTeam7,
        p_team8_id: eastTeam8,
        p_team9_id: eastTeam9,
        p_team10_id: eastTeam10,
      });

      if (error) throw error;

      toast.success("Eastern Conference Play-In bracket created successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create Play-In bracket");
    } finally {
      setCreating(false);
    }
  };

  const renderConferenceSetup = (
    conference: Conference,
    teams: TeamOption[],
    team7: string,
    setTeam7: (val: string) => void,
    team8: string,
    setTeam8: (val: string) => void,
    team9: string,
    setTeam9: (val: string) => void,
    team10: string,
    setTeam10: (val: string) => void,
    onCreateBracket: () => void
  ) => (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield
            className={cn(
              "h-5 w-5",
              conference === "West" ? "text-red-500" : "text-blue-500"
            )}
          />
          <CardTitle>{conference}ern Conference Play-In</CardTitle>
        </div>
        <CardDescription>
          Select teams for seeds 7-10 to create the Play-In tournament bracket
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${conference}-7`}>7th Seed</Label>
            <Select value={team7} onValueChange={setTeam7}>
              <SelectTrigger id={`${conference}-7`}>
                <SelectValue placeholder="Select 7th seed team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${conference}-8`}>8th Seed</Label>
            <Select value={team8} onValueChange={setTeam8}>
              <SelectTrigger id={`${conference}-8`}>
                <SelectValue placeholder="Select 8th seed team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${conference}-9`}>9th Seed</Label>
            <Select value={team9} onValueChange={setTeam9}>
              <SelectTrigger id={`${conference}-9`}>
                <SelectValue placeholder="Select 9th seed team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${conference}-10`}>10th Seed</Label>
            <Select value={team10} onValueChange={setTeam10}>
              <SelectTrigger id={`${conference}-10`}>
                <SelectValue placeholder="Select 10th seed team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="pt-4 space-y-3 border-t">
          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-semibold">Play-In Tournament Format:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Game 1: 7th seed vs 8th seed (BO1)</li>
              <li className="text-green-600">→ Winner becomes 7th playoff seed</li>
              <li>Game 2: 9th seed vs 10th seed (BO1)</li>
              <li>Game 3: Loser of Game 1 vs Winner of Game 2 (BO1)</li>
              <li className="text-green-600">→ Winner becomes 8th playoff seed</li>
            </ul>
          </div>

          <Button
            onClick={onCreateBracket}
            disabled={creating || !team7 || !team8 || !team9 || !team10}
            className="w-full"
          >
            <Trophy className="h-4 w-4 mr-2" />
            Create {conference}ern Play-In Bracket
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {renderConferenceSetup(
        "West",
        westTeams,
        westTeam7,
        setWestTeam7,
        westTeam8,
        setWestTeam8,
        westTeam9,
        setWestTeam9,
        westTeam10,
        setWestTeam10,
        handleCreateWestPlayIn
      )}

      {renderConferenceSetup(
        "East",
        eastTeams,
        eastTeam7,
        setEastTeam7,
        eastTeam8,
        setEastTeam8,
        eastTeam9,
        setEastTeam9,
        eastTeam10,
        setEastTeam10,
        handleCreateEastPlayIn
      )}
    </div>
  );
}
