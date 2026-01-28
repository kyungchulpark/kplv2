import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeasonSelector } from "@/components/stats/season-selector";
import { ScheduleTable } from "@/components/schedule/schedule-table";

interface PastLeaguesPageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

export default async function PastLeaguesPage({ searchParams }: PastLeaguesPageProps) {
  const { seasonId } = await searchParams;
  const supabase = await createClient();

  const pagedSelect = async (table: string, select: string, applyFilters?: (query: any) => any) => {
    const rows: any[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      let query = supabase.from(table).select(select).range(from, to);
      if (applyFilters) {
        query = applyFilters(query);
      }
      const { data, error } = await query;
      if (error) throw error;
      const batch = data || [];
      rows.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }
    return rows;
  };

  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, is_active, start_date")
    .order("start_date", { ascending: false });

  if (!seasons || seasons.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Past League Records</CardTitle>
            <CardDescription>No seasons available.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const defaultSeason = seasons.find((season) => !season.is_active) || seasons[0];
  const selectedSeason = seasons.find((season) => season.id === seasonId) || defaultSeason;

  const matches = await pagedSelect(
    "matches",
    `
    id,
    match_date,
    status,
    home_score,
    away_score,
    match_sequence,
    game_password,
    home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
    away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
  `,
    (query) =>
      query
        .eq("season_id", selectedSeason.id)
        .eq("status", "finished")
        .order("match_date", { ascending: true })
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Past League Records</h1>
            <p className="text-lg text-muted-foreground">
              Finished match results by season
            </p>
          </div>

          <SeasonSelector
            seasons={seasons.map((season) => ({
              id: season.id,
              name: season.name,
              is_active: season.is_active,
            }))}
            selectedSeasonId={selectedSeason.id}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{selectedSeason.name}</CardTitle>
                <CardDescription>Finished matches in schedule view</CardDescription>
              </div>
              <Badge variant={selectedSeason.is_active ? "default" : "secondary"}>
                {selectedSeason.is_active ? "Active" : "Past"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!matches || matches.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No finished matches for this season yet.
              </div>
            ) : (
              <ScheduleTable matches={matches as any} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
