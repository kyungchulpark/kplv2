import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

type Match = {
  id: string;
  match_date: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
  home_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
  away_team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
  };
};

interface TodayMatchesProps {
  matches: Match[];
  isToday: boolean;
}

export function TodayMatches({ matches, isToday }: TodayMatchesProps) {
  const getStatusBadge = (status: Match["status"]) => {
    switch (status) {
      case "live":
        return <Badge className="bg-red-500">LIVE</Badge>;
      case "finished":
        return <Badge variant="secondary">Final</Badge>;
      case "scheduled":
        return <Badge variant="outline">Scheduled</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return null;
    }
  };

  const formatMatchTime = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  };

  const formatMatchDate = (dateString: string) => {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(new Date(dateString));
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold">
            {isToday ? "Today's Matches" : "Recent Matches"}
          </h2>
          <p className="text-muted-foreground">
            {matches.length > 0 ? formatMatchDate(matches[0].match_date) : ""}
          </p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center text-muted-foreground py-6">No matches.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Link key={match.id} href={`/matches/${match.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatMatchTime(match.match_date)}</span>
                    {getStatusBadge(match.status)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {match.home_team.logo_url ? (
                        <img
                          src={match.home_team.logo_url}
                          alt={match.home_team.name}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-nba-red text-white text-xs font-bold flex items-center justify-center">
                          {match.home_team.name.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{match.home_team.name}</p>
                        <p className="text-xs text-muted-foreground">{match.home_team.conference}</p>
                      </div>
                    </div>

                    {match.status === "finished" && (
                      <div className="text-xl font-bold">
                        {match.home_score}
                      </div>
                    )}
                  </div>

                  <div className="text-center text-xs text-muted-foreground">VS</div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {match.away_team.logo_url ? (
                        <img
                          src={match.away_team.logo_url}
                          alt={match.away_team.name}
                          className="h-8 w-8 object-contain"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-nba-red text-white text-xs font-bold flex items-center justify-center">
                          {match.away_team.name.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold">{match.away_team.name}</p>
                        <p className="text-xs text-muted-foreground">{match.away_team.conference}</p>
                      </div>
                    </div>

                    {match.status === "finished" && (
                      <div className="text-xl font-bold">
                        {match.away_score}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground text-right">
                    {formatMatchDate(match.match_date)}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
