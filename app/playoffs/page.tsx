import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BracketView } from "@/components/playoffs/bracket-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy } from "lucide-react";

export default async function PlayoffsPage() {
  const supabase = await createClient();

  // Get active season
  const { data: season } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!season) {
    return (
      <div className="container py-12 text-center">
        <p className="text-muted-foreground">활성 시즌이 없습니다.</p>
      </div>
    );
  }

  // Get playoff brackets for this season
  const { data: brackets } = await supabase
    .from("playoff_brackets")
    .select("*")
    .eq("season_id", season.id)
    .eq("is_active", true);

  const westBracket = brackets?.find((b) => b.bracket_type === "west");
  const eastBracket = brackets?.find((b) => b.bracket_type === "east");

  // Get series for Western Conference
  let westSeries: any[] = [];
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

  // Get series for Eastern Conference
  let eastSeries: any[] = [];
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

  const hasPlayoffs = westSeries.length > 0 || eastSeries.length > 0;

  return (
    <div className="container py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">플레이오프</h1>
        </div>
        <p className="text-muted-foreground">
          {season.name} 플레이오프 브라켓
        </p>
      </div>

      {hasPlayoffs ? (
        <Tabs defaultValue="west" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
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
        <div className="py-12 text-center space-y-4">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <p className="text-lg font-semibold">
              플레이오프가 아직 시작되지 않았습니다
            </p>
            <p className="text-sm text-muted-foreground">
              정규 시즌이 종료되면 플레이오프 브라켓이 생성됩니다
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
