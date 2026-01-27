import { createClient } from "@/utils/supabase/server";
import { Trophy, Award, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function HistoryPage() {
  const supabase = await createClient();

  const { data: championships } = await supabase
    .from("championship_history")
    .select("*")
    .order("championship_date", { ascending: false });

  const { data: awards } = await supabase
    .from("season_awards")
    .select(
      `
      *,
      season:season_id(name),
      player:player_id(psn_id)
    `
    )
    .order("created_at", { ascending: false });

  const getAwardLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      mvp: "Regular Season MVP",
      finals_mvp: "Finals MVP",
      scoring_leader: "Scoring Leader",
      assist_leader: "Assist Leader",
      rebound_leader: "Rebound Leader",
      dpoy: "Defensive Player",
      all_star: "All-Star",
    };
    return labels[type] || type;
  };

  const getAwardIcon = (type: string) => {
    switch (type) {
      case "mvp":
      case "finals_mvp":
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case "scoring_leader":
      case "assist_leader":
      case "rebound_leader":
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <Award className="h-4 w-4 text-primary" />;
    }
  };

  const formatDate = (value?: string | null) => {
    if (!value) return "TBD";
    return new Date(value).toLocaleDateString("en-US");
  };

  return (
    <div className="container max-w-7xl mx-auto space-y-8 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center space-x-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">League History</h1>
        </div>
        <p className="text-muted-foreground">
          League championships and season awards
        </p>
        <Link href="/history/past-leagues">
          <Button variant="outline" size="sm">Past League Records</Button>
        </Link>
      </div>

      <div className="space-y-6">
        <h2 className="text-center text-2xl font-bold">Champions</h2>

        {championships && championships.length > 0 ? (
          <div className="grid gap-6">
            {championships.map((champ: any) => (
              <Card key={champ.id} className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                      <span>{champ.season_name}</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {new Date(champ.championship_date).getFullYear()}
                    </Badge>
                  </div>
                  <CardDescription>
                    {formatDate(champ.start_date)} – {formatDate(champ.end_date)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border-2 border-primary">
                    <div className="flex items-center space-x-3">
                      {champ.champion_logo && (
                        <img
                          src={champ.champion_logo}
                          alt={champ.champion_team_name}
                          className="h-12 w-12 object-contain"
                        />
                      )}
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Champion
                        </div>
                        <div className="text-xl font-bold">
                          {champ.champion_team_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">
                        {champ.finals_series_wins}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        - {champ.finals_series_losses}
                      </div>
                    </div>
                  </div>

                  {champ.runner_up_team_name && (
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center space-x-3">
                        {champ.runner_up_logo && (
                          <img
                            src={champ.runner_up_logo}
                            alt={champ.runner_up_team_name}
                            className="h-8 w-8 object-contain"
                          />
                        )}
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Runner-up
                          </div>
                          <div className="font-semibold">
                            {champ.runner_up_team_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                    <div className="grid gap-3 md:grid-cols-2">
                    {champ.finals_mvp_name && (
                      <div className="flex items-center space-x-2 p-2 rounded border bg-muted/50">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Finals MVP:{" "}
                          </span>
                          <span className="font-semibold">
                            {champ.finals_mvp_name}
                          </span>
                        </div>
                      </div>
                    )}
                    {champ.regular_mvp_name && (
                      <div className="flex items-center space-x-2 p-2 rounded border bg-muted/50">
                        <Award className="h-4 w-4 text-primary" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            Regular Season MVP:{" "}
                          </span>
                          <span className="font-semibold">
                            {champ.regular_mvp_name}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No championship history yet.
          </div>
        )}
      </div>

      {awards && awards.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-center text-2xl font-bold">Season Awards</h2>

          <div className="grid gap-4">
            {awards.map((award: any) => (
              <div
                key={award.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {getAwardIcon(award.award_type)}
                  <div>
                    <div className="font-semibold">
                      {award.player?.psn_id || award.player?.full_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {award.season?.name} - {getAwardLabel(award.award_type)}
                    </div>
                  </div>
                </div>
                {award.stat_value && (
                  <Badge variant="outline">
                    {award.stat_value.toFixed(1)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
