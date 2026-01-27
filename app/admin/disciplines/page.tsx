import { createClient } from "@/utils/supabase/server";
import DisciplineManager from "@/components/admin/discipline-manager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function DisciplinesPage() {
  const supabase = await createClient();

  // Get active season
  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Player Disciplines</h1>
          <p className="text-muted-foreground">
            선수 징계 관리 - 출장정지 부여 및 관리
          </p>
        </div>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>No Active Season</span>
            </CardTitle>
            <CardDescription>
              현재 활성화된 시즌이 없습니다. 새 시즌을 생성하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Player Disciplines</h1>
        <p className="text-muted-foreground">
          선수 징계 관리 - 출장정지 부여 및 관리
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Season: {activeSeason.name}</CardTitle>
          <CardDescription>
            선수에게 출장정지를 부여하고 관리합니다. 경기가 진행되면 자동으로 차감됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DisciplineManager currentSeasonId={activeSeason.id} />
        </CardContent>
      </Card>
    </div>
  );
}
