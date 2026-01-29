"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Filter } from "lucide-react";
import { TeamFormDialog } from "./team-form-dialog";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type Season = {
    id: string;
    name: string;
    is_active: boolean;
};

type Team = {
    id: string;
    name: string;
    conference: string | null;
    logo_url: string | null;
    wins: number;
    losses: number;
    points_for: number;
    points_against: number;
    captain_id: string | null;
    season_id: string;
    season: {
        id: string;
        name: string;
    } | null;
    captain: {
        psn_id: string;
    } | null;
    roster_count: number;
};

type TeamsManagerWithFilterProps = {
    teams: Team[];
    seasons: Season[];
};

export function TeamsManagerWithFilter({ teams, seasons }: TeamsManagerWithFilterProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [selectedSeasonId, setSelectedSeasonId] = useState<string>("all");

    const activeSeason = seasons.find(s => s.is_active);
    const filteredTeams = selectedSeasonId === "all"
        ? teams
        : teams.filter(t => t.season_id === selectedSeasonId);

    const handleCreate = () => {
        setSelectedTeam(null);
        setDialogMode("create");
        setDialogOpen(true);
    };

    const handleEdit = (team: Team) => {
        setSelectedTeam(team);
        setDialogMode("edit");
        setDialogOpen(true);
    };

    const handleDelete = async (teamId: string, teamName: string) => {
        if (!confirm(`"${teamName}" 팀을 삭제하시겠습니까?`)) return;

        try {
            const supabase = createClient();
            const { error } = await supabase.from("teams").delete().eq("id", teamId);
            if (error) throw error;
            toast.success("팀이 삭제되었습니다");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "삭제 실패");
        }
    };

    const winRate = (wins: number, losses: number) => {
        const total = wins + losses;
        if (total === 0) return "0.0";
        return ((wins / total) * 100).toFixed(1);
    };

    const teamCountBySeason = (seasonId: string) => teams.filter(t => t.season_id === seasonId).length;

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Teams</h1>
                        <p className="text-muted-foreground">
                            {selectedSeasonId === "all"
                                ? `전체 시즌 - ${filteredTeams.length}개 팀`
                                : `${seasons.find(s => s.id === selectedSeasonId)?.name || ""} - ${filteredTeams.length}개 팀`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="시즌 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">전체 시즌 ({teams.length}개 팀)</SelectItem>
                                    {seasons.map((season) => (
                                        <SelectItem key={season.id} value={season.id}>
                                            {season.name} {season.is_active && "(Active)"} ({teamCountBySeason(season.id)}개)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={handleCreate}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Team
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b text-sm">
                                <th className="text-left py-3 px-2">Team</th>
                                <th className="text-center py-3 px-2">Season</th>
                                <th className="text-center py-3 px-2">Conference</th>
                                <th className="text-center py-3 px-2">W-L</th>
                                <th className="text-center py-3 px-2">Win%</th>
                                <th className="text-center py-3 px-2">Roster</th>
                                <th className="text-left py-3 px-2">Captain</th>
                                <th className="text-right py-3 px-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTeams.map((team) => (
                                <tr key={team.id} className="border-b hover:bg-muted/50">
                                    <td className="py-4 px-2">
                                        <div className="flex items-center space-x-3">
                                            {team.logo_url ? (
                                                <img
                                                  src={team.logo_url}
                                                  alt={team.name}
                                                  className="h-8 w-8 object-contain"
                                                  loading="lazy"
                                                  decoding="async"
                                                />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-nba-red flex items-center justify-center text-xs font-bold text-white">
                                                    {team.name.substring(0, 2)}
                                                </div>
                                            )}
                                            <span className="font-semibold">{team.name}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <Badge variant="outline" className="text-xs">{team.season?.name || "-"}</Badge>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        {team.conference ? (
                                            <Badge
                                                variant="outline"
                                                className={team.conference === "West" ? "border-nba-blue text-nba-blue" : "border-nba-red text-nba-red"}
                                            >
                                                {team.conference}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-2 text-center font-medium">{team.wins}-{team.losses}</td>
                                    <td className="py-4 px-2 text-center">{winRate(team.wins, team.losses)}%</td>
                                    <td className="py-4 px-2 text-center">
                                        <span className="text-sm">{team.roster_count || 0}</span>
                                    </td>
                                    <td className="py-4 px-2">
                                        {team.captain ? (
                                            <span className="text-sm">{team.captain.psn_id}</span>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-2 text-right">
                                        <div className="flex justify-end space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEdit(team)}>Edit</Button>
                                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(team.id, team.name)}>Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredTeams.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">
                                {selectedSeasonId === "all" ? "등록된 팀이 없습니다" : "이 시즌에 등록된 팀이 없습니다"}
                            </p>
                            <Button onClick={handleCreate}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add First Team
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <TeamFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                team={selectedTeam as any}
                mode={dialogMode}
                seasonId={activeSeason?.id || ""}
            />
        </>
    );
}
