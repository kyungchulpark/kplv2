"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Trophy } from "lucide-react";
import { SeasonFormDialog } from "./season-form-dialog";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Season = {
  id: string;
  name: string;
  game_version?: string | null;
  start_date: string;
  end_date: string | null;
  playoff_cutoff: number;
  is_active: boolean;
};

type SeasonsManagerProps = {
  seasons: Season[];
};

export function SeasonsManager({ seasons }: SeasonsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  const handleCreate = () => {
    setSelectedSeason(null);
    setDialogMode("create");
    setDialogOpen(true);
  };

  const handleEdit = (season: Season) => {
    setSelectedSeason(season);
    setDialogMode("edit");
    setDialogOpen(true);
  };

  const handleActivate = async (seasonId: string) => {
    try {
      const supabase = createClient();

      // Deactivate all seasons first and wait for completion
      const { error: deactivateError } = await supabase
        .from("seasons")
        .update({ is_active: false })
        .neq("id", "");

      if (deactivateError) throw deactivateError;

      // Only then activate selected season
      const { error } = await supabase
        .from("seasons")
        .update({ is_active: true })
        .eq("id", seasonId);

      if (error) throw error;

      toast.success("시즌이 활성화되었습니다");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "활성화 실패");
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Seasons</h1>
            <p className="text-muted-foreground">시즌 관리</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Season
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seasons?.map((season) => (
            <Card
              key={season.id}
              className={season.is_active ? "border-nba-red" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <Trophy className="h-5 w-5" />
                      <span>{season.name}</span>
                    </CardTitle>
                    <CardDescription>{season.game_version || "버전 미입력"}</CardDescription>
                  </div>
                  {season.is_active && (
                    <Badge className="bg-nba-red">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {new Date(season.start_date).toLocaleDateString("ko-KR")}
                    {season.end_date && (
                      <> - {new Date(season.end_date).toLocaleDateString("ko-KR")}</>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Playoff Cutoff:</span>
                  <span className="font-semibold">Top {season.playoff_cutoff}</span>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(season)}
                  >
                    Edit
                  </Button>
                  {!season.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleActivate(season.id)}
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!seasons || seasons.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">시즌이 없습니다</p>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Season
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <SeasonFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        season={selectedSeason}
        mode={dialogMode}
      />
    </>
  );
}
