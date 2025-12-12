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
    championships?: number;
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

  // Determine conference colors
  const isWest = team.conference === "West";
  const conferenceColor = isWest ? "red" : "blue";
  const conferenceBgColor = isWest ? "bg-red-500" : "bg-blue-500";
  const conferenceHoverColor = isWest ? "hover:text-red-600" : "hover:text-blue-600";
  const conferenceBorderColor = isWest ? "hover:border-red-200" : "hover:border-blue-200";

  return (
    <Link href={`/teams/${team.id}`}>
      <Card className={`group cursor-pointer border-slate-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 ${conferenceBorderColor} hover:shadow-lg`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-center space-x-3">
              {team.logo_url ? (
                <div className={`h-12 w-12 rounded p-1 ${team.conference ? conferenceBgColor : 'bg-slate-200'}`}>
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="h-full w-full rounded object-contain"
                  />
                </div>
              ) : (
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${team.conference ? conferenceBgColor : 'bg-emerald-500'} text-xl font-bold text-white`}>
                  {team.name.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className={`truncate text-lg font-bold transition-colors ${team.conference ? conferenceHoverColor : 'group-hover:text-emerald-600'}`}>
                  {team.name}
                </h3>
                {team.region && (
                  <p className="text-xs text-muted-foreground">{team.region}</p>
                )}
              </div>
            </div>

            {team.conference && (
              <Badge
                variant="outline"
                className={
                  isWest
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-blue-200 bg-blue-50 text-blue-700"
                }
              >
                {team.conference}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Win Rate</span>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-lg">
                {winRate}%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Championships</span>
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="font-semibold">{team.championships || 0}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Roster Size</span>
            <div className="flex items-center space-x-2">
              <Users className={`h-4 w-4 ${team.conference ? (isWest ? 'text-red-600' : 'text-blue-600') : 'text-emerald-600'}`} />
              <span className="font-semibold">{rosterCount} players</span>
            </div>
          </div>

          {team.captain && (
            <div className="border-t pt-2">
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={team.captain.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {team.captain.psn_id.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Captain</p>
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
