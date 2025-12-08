"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shuffle, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  conference: "West" | "East";
}

interface ConferenceDrawClientProps {
  seasonId: string;
  seasonName: string;
  teams: Team[];
}

export function ConferenceDrawClient({
  seasonId,
  seasonName,
  teams,
}: ConferenceDrawClientProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    west: Team[];
    east: Team[];
  } | null>(null);

  const shuffleTeams = () => {
    // Fisher-Yates shuffle algorithm
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Split into two conferences (as evenly as possible)
    const mid = Math.ceil(shuffled.length / 2);
    const westTeams = shuffled.slice(0, mid);
    const eastTeams = shuffled.slice(mid);

    setPreview({
      west: westTeams,
      east: eastTeams,
    });
  };

  const applyDraw = async () => {
    if (!preview) {
      toast.error("먼저 추첨을 진행하세요.");
      return;
    }

    if (!confirm(`정말로 조 추첨을 적용하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.\n\n${seasonName}의 모든 팀이 재배정됩니다.`)) {
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      // Update West teams
      const westUpdates = preview.west.map((team) =>
        supabase
          .from("teams")
          .update({ conference: "West" })
          .eq("id", team.id)
      );

      // Update East teams
      const eastUpdates = preview.east.map((team) =>
        supabase
          .from("teams")
          .update({ conference: "East" })
          .eq("id", team.id)
      );

      // Execute all updates
      await Promise.all([...westUpdates, ...eastUpdates]);

      toast.success("조 추첨이 적용되었습니다!");

      // Reload page to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      toast.error(`조 추첨 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetPreview = () => {
    setPreview(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>조 추첨 실행</CardTitle>
          <CardDescription>
            랜덤으로 팀을 Western/Eastern Conference에 배정합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Warning */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              조 추첨은 시즌 시작 전 또는 컨퍼런스 재편성 시에만 실행하세요.
              <br />
              기존 순위 및 경기 일정에 영향을 줄 수 있습니다.
            </AlertDescription>
          </Alert>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={shuffleTeams}
              disabled={loading || teams.length === 0}
              variant="outline"
            >
              <Shuffle className="mr-2 h-4 w-4" />
              조 추첨 (미리보기)
            </Button>
            {preview && (
              <>
                <Button onClick={applyDraw} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      적용 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      추첨 결과 적용
                    </>
                  )}
                </Button>
                <Button onClick={resetPreview} disabled={loading} variant="ghost">
                  취소
                </Button>
              </>
            )}
          </div>

          {teams.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>추첨할 팀이 없습니다.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              추첨 결과 (미리보기)
              <Badge variant="outline">적용 전</Badge>
            </CardTitle>
            <CardDescription>
              아래 결과가 마음에 들면 "추첨 결과 적용" 버튼을 클릭하세요.
              다시 추첨하려면 "조 추첨" 버튼을 다시 클릭하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Western Conference */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  Western Conference
                  <Badge>{preview.west.length}팀</Badge>
                </h3>
                <div className="space-y-2">
                  {preview.west.map((team, idx) => (
                    <div
                      key={team.id}
                      className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 flex items-center gap-3"
                    >
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {idx + 1}.
                      </span>
                      {team.logo_url && (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-6 w-6 object-contain"
                        />
                      )}
                      <span className="font-medium">{team.name}</span>
                      {team.conference !== "West" && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          변경
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Eastern Conference */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  Eastern Conference
                  <Badge>{preview.east.length}팀</Badge>
                </h3>
                <div className="space-y-2">
                  {preview.east.map((team, idx) => (
                    <div
                      key={team.id}
                      className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 flex items-center gap-3"
                    >
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {idx + 1}.
                      </span>
                      {team.logo_url && (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="h-6 w-6 object-contain"
                        />
                      )}
                      <span className="font-medium">{team.name}</span>
                      {team.conference !== "East" && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          변경
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
