import { createClient } from "@/utils/supabase/server";
import { BracketView } from "@/components/playoffs/bracket-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";

export default async function PlayoffsPage() {
  const supabase = await createClient();

  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">No active season.</p>
      </div>
    );
  }

  const { data: brackets } = await supabase
    .from("playoff_brackets")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_active", true);

  const westBracket = brackets?.find((b) => b.bracket_type === "west");
  const eastBracket = brackets?.find((b) => b.bracket_type === "east");

  const fetchSeries = async (bracketId?: string | null) => {
    if (!bracketId) return [];
    const { data } = await supabase
      .from("playoff_series")
      .select(
        `
        *,
        team1:team1_id(id, name, logo_url),
        team2:team2_id(id, name, logo_url)
      `
      )
      .eq("bracket_id", bracketId)
      .order("round_number", { ascending: true })
      .order("series_number", { ascending: true });
    return data || [];
  };

  const westSeries = await fetchSeries(westBracket?.id);
  const eastSeries = await fetchSeries(eastBracket?.id);

  const hasPlayoffs = westSeries.length > 0 || eastSeries.length > 0;

  return (
    <div className="container py-8 space-y-8">
      <div className="space-y-2 text-center">
        <div className="flex items-center justify-center space-x-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Playoffs</h1>
        </div>
        <p className="text-muted-foreground text-center">
          {season.name} Playoff Brackets
        </p>
      </div>

      {hasPlayoffs ? (
        <Tabs defaultValue="west" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
            <TabsTrigger value="west">Western Conference</TabsTrigger>
            <TabsTrigger value="east">Eastern Conference</TabsTrigger>
          </TabsList>

          <TabsContent value="west" className="mt-6">
            <BracketView series={westSeries} conference="West" />
          </TabsContent>

          <TabsContent value="east" className="mt-6">
            <BracketView series={eastSeries} conference="East" />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4 max-w-md">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50" />
            <div className="space-y-2">
              <p className="text-lg font-semibold">
                Playoff bracket not created yet.
              </p>
              <p className="text-sm text-muted-foreground">
                Seed the bracket from the admin panel to view playoff series here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
