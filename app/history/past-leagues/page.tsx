import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeasonSelector } from "@/components/stats/season-selector";

interface PastLeaguesPageProps {
  searchParams: Promise<{
    seasonId?: string;
  }>;
}

export default async function PastLeaguesPage({ searchParams }: PastLeaguesPageProps) {
  const { seasonId } = await searchParams;
  const supabase = await createClient();

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

  const { data: matches } = await supabase
    .from("matches")
    .select(
      `
      id,
      match_date,
      status,
      home_score,
      away_score,
      home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
      away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
    `
    )
    .eq("season_id", selectedSeason.id)
    .eq("status", "finished")
    .order("match_date", { ascending: false });

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
                <CardDescription>Match results table</CardDescription>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        Date
                      </th>
                      <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        Matchup
                      </th>
                      <th className="px-3 py-2 text-center text-xs uppercase tracking-wide text-muted-foreground">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(matches as any[]).map((match) => (
                      <tr key={match.id} className="border-b hover:bg-muted/40">
                        <td className="px-3 py-3 text-muted-foreground">
                          {new Date(match.match_date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{match.home_team?.name}</div>
                            <div className="text-xs text-muted-foreground">vs {match.away_team?.name}</div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold">
                          {match.home_score} - {match.away_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
