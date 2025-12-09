import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient, getCurrentUser } from "@/utils/supabase/server";
import { Calendar, CheckCircle, Clock, Info } from "lucide-react";

type Match = {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  match_sequence: string | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
  };
};

const statusCopy: Record<Match["status"], { label: string; variant: "outline" | "secondary" | "destructive" | "default" }> = {
  scheduled: { label: "예정", variant: "outline" },
  live: { label: "LIVE", variant: "default" },
  finished: { label: "종료", variant: "secondary" },
  cancelled: { label: "취소", variant: "destructive" },
};

export default async function ResultsUploadPage() {
  const user = await getCurrentUser();

  // Check if user is logged in
  if (!user) {
    redirect("/");
  }

  const supabase = await createClient();

  const { data: activeSeason } = await supabase
    .from("seasons")
    .select("id, name")
    .eq("is_active", true)
    .single();

  if (!activeSeason) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>활성 시즌이 없습니다</CardTitle>
            <CardDescription>시즌을 먼저 개설·활성화한 뒤 경기 결과를 입력하세요.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Permission logic: Show matches based on user role
  // - Admin/Staff: See all scheduled/live matches
  // - Team members: See only their team's scheduled/live matches
  const userRole = (user.profile as any)?.role;
  const isAdminOrStaff = ["admin", "staff"].includes(userRole);

  let matchesQuery = supabase
    .from("matches")
    .select(
      `
        id,
        match_date,
        status,
        match_sequence,
        home_team:teams!matches_home_team_id_fkey(id, name, logo_url),
        away_team:teams!matches_away_team_id_fkey(id, name, logo_url)
      `
    )
    .eq("season_id", activeSeason.id)
    .in("status", ["scheduled", "live"])
    .order("match_date", { ascending: true });

  // If not admin/staff, filter to only show matches where user is a team member
  if (!isAdminOrStaff) {
    // Get user's teams
    const { data: userRosters } = await supabase
      .from("team_rosters")
      .select("team_id")
      .eq("player_id", user.id)
      .eq("season_id", activeSeason.id)
      .eq("is_active", true);

    const userTeamIds = userRosters?.map((r) => r.team_id) || [];

    if (userTeamIds.length === 0) {
      // User is not on any team - show empty state
      return (
        <div className="container mx-auto px-4 py-10">
          <Card>
            <CardHeader>
              <CardTitle>팀에 소속되어 있지 않습니다</CardTitle>
              <CardDescription>
                경기 결과를 입력하려면 먼저 팀에 가입해야 합니다.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      );
    }

    // Filter matches where user's team is playing (home or away)
    matchesQuery = matchesQuery.or(
      `home_team_id.in.(${userTeamIds.join(",")}),away_team_id.in.(${userTeamIds.join(",")})`
    );
  }

  const { data: matches } = await matchesQuery;

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">경기 결과 업로드</h1>
        <p className="text-muted-foreground">
          {activeSeason.name} 경기 결과를 입력해 기록실에 바로 반영하세요.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-nba-blue" />
            <CardTitle>입력 시 체크 리스트</CardTitle>
          </div>
          <Badge variant="secondary">로스터 + 득점/슈팅 검증</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-nba-red mt-[2px]" />
              <span>경기 일자·매치업이 맞는지 확인 후 입력</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-nba-red mt-[2px]" />
              <span>홈/원정 각각 5명, 중복/누락 없는지 검증</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-nba-red mt-[2px]" />
              <span>FG/3P/FT 시도 ≥ 성공, 득점은 자동 계산</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-nba-red mt-[2px]" />
              <span>저장 시 즉시 일정·기록·순위에 반영</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">입력 대기 경기</h2>
          <Badge variant="outline">
            총 {matches?.length || 0}경기
          </Badge>
        </div>

        {(!matches || matches.length === 0) ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center space-y-2">
              <p className="text-lg font-semibold">입력할 경기가 없습니다</p>
              <p className="text-sm text-muted-foreground">
                일정이 끝났다면 관리자 페이지에서 결과 입력 여부를 확인하세요.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {matches.map((match) => {
              const matchDate = new Date(match.match_date);
              const status = statusCopy[match.status];
              return (
                <Card key={match.id} className="border-2 hover:border-primary transition-colors">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{matchDate.toLocaleDateString("ko-KR")}</span>
                        <Clock className="h-4 w-4 ml-2" />
                        <span>{matchDate.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      </div>
                      {match.match_sequence && (
                        <code className="text-xs rounded bg-muted px-2 py-1 text-muted-foreground">
                          {match.match_sequence}
                        </code>
                      )}
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <TeamBadge team={match.home_team} align="right" />
                      <span className="text-sm text-muted-foreground">vs</span>
                      <TeamBadge team={match.away_team} />
                    </div>
                    <div className="flex justify-end">
                      <Button asChild>
                        <Link href={`/stats/upload/${match.id}`}>
                          경기 결과 입력
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamBadge({
  team,
  align = "left",
}: {
  team: Match["home_team"];
  align?: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}>
      {team.logo_url ? (
        <img
          src={team.logo_url}
          alt={team.name}
          className="h-10 w-10 rounded-lg border object-contain bg-white"
        />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-nba-red text-white flex items-center justify-center font-bold text-sm">
          {team.name.substring(0, 2)}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold">{team.name}</p>
        <p className="text-xs text-muted-foreground">{align === "right" ? "HOME" : "AWAY"}</p>
      </div>
    </div>
  );
}
