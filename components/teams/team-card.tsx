import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Trophy } from "lucide-react";

interface TeamCardProps {
  team: {
    id: string;
    name: string;
    logo_url: string | null;
    conference: string | null;
    region: string | null;
    wins: number;
    losses: number;
    captain: {
      id: string;
      psn_id: string;
      avatar_url: string | null;
    } | null;
    _rosters: { count: number }[];
  };
}

export function TeamCard({ team }: TeamCardProps) {
  const rosterCount = team._rosters?.[0]?.count || 0;
  const gamesPlayed = team.wins + team.losses;
  const winRate =
    gamesPlayed > 0 ? ((team.wins / gamesPlayed) * 100).toFixed(1) : "0.0";

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className="group hover:border-primary/50 transition-all hover:shadow-lg cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            {/* Team Logo */}
            <div className="flex items-center space-x-3 flex-1">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="h-16 w-16 object-contain"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-nba-red flex items-center justify-center text-2xl font-bold text-white">
                  {team.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg group-hover:text-primary transition-colors truncate">
                  {team.name}
                </h3>
                {team.region && (
                  <p className="text-xs text-muted-foreground">{team.region}</p>
                )}
              </div>
            </div>

            {/* Conference Badge */}
            {team.conference && (
              <Badge
                variant="outline"
                className={
                  team.conference === "West"
                    ? "border-blue-500 text-blue-500"
                    : "border-red-500 text-red-500"
                }
              >
                {team.conference}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Record */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">전적</span>
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">
                {team.wins}승 {team.losses}패
              </span>
              <span className="text-muted-foreground">({winRate}%)</span>
            </div>
          </div>

          {/* Roster Count */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">로스터</span>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="font-semibold">{rosterCount}명</span>
            </div>
          </div>

          {/* Captain */}
          {team.captain && (
            <div className="pt-2 border-t">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={team.captain.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {team.captain.psn_id.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">팀장</p>
                  <p className="text-sm font-medium">{team.captain.psn_id}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
