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

export default async function ChampionshipHistoryPage() {
  const supabase = await createClient();

  // Get championship history
  const { data: championships } = await supabase
    .from("championship_history")
    .select("*")
    .order("championship_date", { ascending: false });

  // Get all season awards
  const { data: awards } = await supabase
    .from("season_awards")
    .select(
      `
      *,
      season:season_id(name),
      player:player_id(psn_id, full_name)
    `
    )
    .order("created_at", { ascending: false });

  const getAwardLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      mvp: "정규시즌 MVP",
      finals_mvp: "파이널 MVP",
      scoring_leader: "득점왕",
      assist_leader: "어시스트왕",
      rebound_leader: "리바운드왕",
      dpoy: "올해의 수비수",
      all_star: "올스타",
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

  return (
    <div className="container py-8 space-y-8">
      {/* Page Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">챔피언십 역사</h1>
        </div>
        <p className="text-muted-foreground">
          역대 챔피언 기록 및 시즌별 수상 내역
        </p>
      </div>

      {/* Championships */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">역대 챔피언</h2>

        {championships && championships.length > 0 ? (
          <div className="grid gap-6">
            {championships.map((champ: any) => (
              <Card key={champ.id} className="border-2 border-primary/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-6 w-6 text-yellow-500" />
                      <span>{champ.season_name}</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {new Date(champ.championship_date).getFullYear()}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(champ.start_date).toLocaleDateString("ko-KR")} -{" "}
                    {new Date(champ.end_date).toLocaleDateString("ko-KR")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Champion */}
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
                          챔피언
                        </div>
                        <div className="text-xl font-bold">
                          {champ.champion_team_name}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {champ.finals_series_wins}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        - {champ.finals_series_losses}
                      </div>
                    </div>
                  </div>

                  {/* Runner-up */}
                  {champ.runner_up_team_name && (
                    <div className="flex items-center justify-between p-3 rounded-lg border">
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
                            준우승
                          </div>
                          <div className="font-semibold">
                            {champ.runner_up_team_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MVPs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {champ.finals_mvp_name && (
                      <div className="flex items-center space-x-2 p-2 rounded border bg-muted/50">
                        <Trophy className="h-4 w-4 text-yellow-500" />
                        <div className="text-sm">
                          <span className="text-muted-foreground">
                            파이널 MVP:{" "}
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
                            정규시즌 MVP:{" "}
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
            아직 기록된 챔피언십이 없습니다.
          </div>
        )}
      </div>

      {/* Season Awards */}
      {awards && awards.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">시즌별 수상 내역</h2>

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
