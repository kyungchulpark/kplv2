"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { BracketView } from "@/components/playoffs/bracket-view";
import { RefreshCcw, Shield, Trophy } from "lucide-react";

type SeriesTeam = {
  id: string;
  name: string;
  logo_url: string | null;
};

type PlayoffSeries = {
  id: string;
  round_number: number;
  series_number: number;
  team1: SeriesTeam | null;
  team2: SeriesTeam | null;
  team1_seed: number | null;
  team2_seed: number | null;
  team1_wins: number;
  team2_wins: number;
  winner_id: string | null;
  series_format: "BO3" | "BO5";
  status: "pending" | "ongoing" | "completed";
};

interface PlayoffManagerProps {
  seasonId: string;
  westSeries: PlayoffSeries[];
  eastSeries: PlayoffSeries[];
}

export function PlayoffManager({
  seasonId,
  westSeries,
  eastSeries,
}: PlayoffManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loadingConf, setLoadingConf] = useState<"West" | "East" | null>(null);

  const seedConference = async (conference: "West" | "East") => {
    setLoadingConf(conference);
    try {
      const { error } = await supabase.rpc("seed_playoff_bracket", {
        p_season_id: seasonId,
        p_conference: conference,
      });
      if (error) throw error;
      toast.success(`${conference} 컨퍼런스 시드를 생성/업데이트했습니다.`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "시드 생성 실패");
    } finally {
      setLoadingConf(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => seedConference("West")}
          disabled={loadingConf !== null}
        >
          <Shield className="h-4 w-4 mr-2 text-red-500" />
          Western 시드 생성
        </Button>
        <Button
          variant="outline"
          onClick={() => seedConference("East")}
          disabled={loadingConf !== null}
        >
          <Shield className="h-4 w-4 mr-2 text-blue-500" />
          Eastern 시드 생성
        </Button>
        <Button
          variant="secondary"
          onClick={() => router.refresh()}
          disabled={loadingConf !== null}
        >
          <RefreshCcw className="h-4 w-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-red-500" />
              Western Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {westSeries.length > 0 ? (
              <BracketView series={westSeries} conference="West" />
            ) : (
              <p className="text-muted-foreground text-sm">
                아직 브래킷이 없습니다. 시드 생성을 눌러주세요.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-blue-500" />
              Eastern Bracket
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eastSeries.length > 0 ? (
              <BracketView series={eastSeries} conference="East" />
            ) : (
              <p className="text-muted-foreground text-sm">
                아직 브래킷이 없습니다. 시드 생성을 눌러주세요.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
