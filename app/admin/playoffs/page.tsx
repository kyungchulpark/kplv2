import { createClient } from "@/utils/supabase/server";
import { PlayoffManager } from "@/components/admin/playoff-manager";
import { PlayInSetup } from "@/components/admin/playin-setup";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Trophy, Target } from "lucide-react";

export default async function AdminPlayoffsPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Playoffs</CardTitle>
          <CardDescription>No active season.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data: brackets } = await supabase
    .from("playoff_brackets")
    .select("*")
    .eq("season_id", season.id);

  const westBracket = brackets?.find((b) => b.bracket_type === "west");
  const eastBracket = brackets?.find((b) => b.bracket_type === "east");

  let westSeries: any[] = [];
  let eastSeries: any[] = [];
  const westBracketId = westBracket?.id;
  const eastBracketId = eastBracket?.id;

  if (westBracket) {
    const { data } = await supabase
      .from("playoff_series")
      .select(
        `
        *,
        team1:team1_id(id, name, logo_url),
        team2:team2_id(id, name, logo_url)
      `
      )
      .eq("bracket_id", westBracket.id)
      .order("round_number", { ascending: true })
      .order("series_number", { ascending: true });

    westSeries = data || [];
  }

  if (eastBracket) {
    const { data } = await supabase
      .from("playoff_series")
      .select(
        `
        *,
        team1:team1_id(id, name, logo_url),
        team2:team2_id(id, name, logo_url)
      `
      )
      .eq("bracket_id", eastBracket.id)
      .order("round_number", { ascending: true })
      .order("series_number", { ascending: true });

    eastSeries = data || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Playoffs Management</h1>
          <p className="text-muted-foreground">{season.name}</p>
        </div>
      </div>

      <Tabs defaultValue="playin" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="playin">
            <Target className="h-4 w-4 mr-2" />
            Play-In Tournament
          </TabsTrigger>
          <TabsTrigger value="bracket">
            <Trophy className="h-4 w-4 mr-2" />
            Full Bracket
          </TabsTrigger>
        </TabsList>

        <TabsContent value="playin" className="space-y-6 mt-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Play-In Tournament Setup</h2>
            <p className="text-muted-foreground">
              Create Play-In brackets for each conference. The tournament determines the 7th and 8th playoff seeds.
            </p>
          </div>
          <PlayInSetup seasonId={season.id} />
        </TabsContent>

        <TabsContent value="bracket" className="space-y-6 mt-6">
          <PlayoffManager
            seasonId={season.id}
            westSeries={westSeries}
            eastSeries={eastSeries}
            westBracketId={westBracketId}
            eastBracketId={eastBracketId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
