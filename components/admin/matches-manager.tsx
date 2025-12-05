"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar } from "lucide-react";
import { MatchFormDialog } from "./match-form-dialog";
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
    if (!confirm("경기를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.from("matches").delete().eq("id", matchId);

      if (error) throw error;

      toast.success("경기가 삭제되었습니다");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "삭제 실패");
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
              {seasonName} - {matches.length}개 경기
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
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(match)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(match.id)}
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
