"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, RefreshCcw, Sparkles } from "lucide-react";
import { MatchFormDialog } from "./match-form-dialog";
import { ForfeitDialog } from "./forfeit-dialog";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Match = {
  id: string;
  match_date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  match_sequence: string | null;
  home_team: {
    name: string;
    logo_url: string | null;
  };
  away_team: {
    name: string;
    logo_url: string | null;
  };
  home_team_id: string;
  away_team_id: string;
  game_password: string | null;
};

type MatchesManagerProps = {
  matches: Match[];
  seasonId: string;
  seasonName: string;
};

export function MatchesManager({
  matches,
  seasonId,
  seasonName,
}: MatchesManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();

  const handleCreate = () => {
    setSelectedMatch(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (match: Match) => {
    setSelectedMatch(match);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleDelete = async (matchId: string) => {
    if (!confirm("경기를 완전히 삭제할까요?")) {
      return;
    }

    try {
      const { error } = await supabase.from("matches").delete().eq("id", matchId);

      if (error) throw error;

      toast.success("경기가 삭제되었습니다.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "삭제 실패");
    }
  };

  const recalcStandings = async () => {
    const { error } = await supabase.rpc("recalculate_team_standings");
    if (error) throw error;
  };

  const handleReset = async (match: Match) => {
    if (
      !confirm(
        "이 경기의 결과/몰수 여부를 모두 초기화하고 예정 상태로 되돌립니다.\n관련 기록도 삭제됩니다."
      )
    ) {
      return;
    }

    setProcessingId(match.id);
    try {
      await supabase.from("match_stats").delete().eq("match_id", match.id);

      const { error } = await supabase
        .from("matches")
        .update({
          status: "scheduled",
          home_score: null,
          away_score: null,
          is_forfeit: false,
          forfeit_winner_id: null,
          forfeit_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (error) throw error;

      await recalcStandings();
      toast.success("경기를 리셋했습니다.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "리셋 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRandomResult = async (match: Match) => {
    if (!confirm("무작위 점수로 경기 결과를 입력할까요?")) {
      return;
    }

    setProcessingId(match.id);
    try {
      const baseScore = 60 + Math.floor(Math.random() * 41); // 60~100
      const diff = Math.floor(Math.random() * 16) - 8; // -8 ~ +7
      let homeScore = baseScore;
      let awayScore = baseScore + diff;
      if (homeScore === awayScore) {
        awayScore += 3;
      }

      await supabase.from("match_stats").delete().eq("match_id", match.id);

      const { error } = await supabase
        .from("matches")
        .update({
          status: "finished",
          home_score: homeScore,
          away_score: awayScore,
          is_forfeit: false,
          forfeit_winner_id: null,
          forfeit_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      if (error) throw error;

      await recalcStandings();
      toast.success("무작위 결과가 적용되었습니다.");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "무작위 결과 적용 실패");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline">예정</Badge>;
      case "live":
        return <Badge className="bg-red-500">LIVE</Badge>;
      case "finished":
        return <Badge variant="secondary">종료</Badge>;
      case "cancelled":
        return <Badge variant="destructive">취소</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Matches</h1>
            <p className="text-muted-foreground">
              {seasonName} - {matches.length}경기
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Match
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-sm">
                <th className="text-left py-3 px-2">Date/Time</th>
                <th className="text-left py-3 px-2">Matchup</th>
                <th className="text-center py-3 px-2">Status</th>
                <th className="text-center py-3 px-2">Score</th>
                <th className="text-center py-3 px-2">Sequence</th>
                <th className="text-right py-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id} className="border-b hover:bg-muted/50">
                  <td className="py-4 px-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(match.match_date).toLocaleDateString("ko-KR")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(match.match_date).toLocaleTimeString("ko-KR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2">
                    <div className="flex items-center space-x-4">
                      {/* Home Team */}
                      <div className="flex items-center space-x-2">
                        {match.home_team.logo_url ? (
                          <img
                            src={match.home_team.logo_url}
                            alt={match.home_team.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded bg-nba-red flex items-center justify-center text-[10px] font-bold text-white">
                            {match.home_team.name.substring(0, 2)}
                          </div>
                        )}
                        <span className="text-sm font-medium">
                          {match.home_team.name}
                        </span>
                      </div>

                      <span className="text-xs text-muted-foreground">vs</span>

                      {/* Away Team */}
                      <div className="flex items-center space-x-2">
                        {match.away_team.logo_url ? (
                          <img
                            src={match.away_team.logo_url}
                            alt={match.away_team.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded bg-nba-red flex items-center justify-center text-[10px] font-bold text-white">
                            {match.away_team.name.substring(0, 2)}
                          </div>
                        )}
                        <span className="text-sm font-medium">
                          {match.away_team.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-center">
                    {getStatusBadge(match.status)}
                  </td>
                  <td className="py-4 px-2 text-center">
                    {match.status === "finished" ? (
                      <span className="text-sm font-bold">
                        {match.home_score} - {match.away_score}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-4 px-2 text-center">
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {match.match_sequence || "-"}
                    </code>
                  </td>
                  <td className="py-4 px-2 text-right">
                    <div className="flex justify-end flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(match)}
                        disabled={processingId === match.id}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRandomResult(match)}
                        disabled={processingId === match.id}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        랜덤 결과
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReset(match)}
                        disabled={processingId === match.id}
                      >
                        <RefreshCcw className="h-4 w-4 mr-1" />
                        리셋
                      </Button>
                      {match.status === "scheduled" && (
                        <ForfeitDialog
                          match={{
                            id: match.id,
                            home_team_id: match.home_team_id,
                            away_team_id: match.away_team_id,
                            home_team_name: match.home_team.name,
                            away_team_name: match.away_team.name,
                            match_date: match.match_date,
                            status: match.status,
                          }}
                          onSuccess={() => router.refresh()}
                        />
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(match.id)}
                        disabled={processingId === match.id}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {matches.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground mb-4">등록된 경기가 없습니다</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Match
              </Button>
            </div>
          )}
        </div>
      </div>

      <MatchFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        match={selectedMatch}
        mode={dialogMode}
        seasonId={seasonId}
      />
    </>
  );
}
