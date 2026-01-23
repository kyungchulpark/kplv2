"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Archive, ArchiveRestore } from "lucide-react";
import { TeamFormDialog } from "./team-form-dialog";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    is_disbanded: boolean;
    season: {
        id: string;
        name: string;
        is_active: boolean;
    } | null;
    captain: {
        psn_id: string;
    } | null;
    roster_count: number;
    is_current_season: boolean;
};

type Season = {
    id: string;
    name: string;
} | null;

type TeamsManagerSimpleProps = {
    teams: Team[];
    activeSeason: Season;
};

export function TeamsManagerSimple({ teams, activeSeason }: TeamsManagerSimpleProps) {
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disbanded">("all");

    // 중복 팀 이름 제거 (현재 시즌 팀 우선)
    const uniqueTeams = useMemo(() => {
        const deduped = teams.reduce((acc, team) => {
            const existing = acc.find(t => t.name === team.name);
            if (!existing) {
                acc.push(team);
            } else if (team.is_current_season && !existing.is_current_season) {
                // 현재 시즌 팀으로 교체
                const idx = acc.indexOf(existing);
                acc[idx] = team;
            }
            return acc;
        }, [] as Team[]);

        // Apply status filter
        if (statusFilter === "active") {
            return deduped.filter(team => !team.is_disbanded);
        } else if (statusFilter === "disbanded") {
            return deduped.filter(team => team.is_disbanded);
        }
        return deduped;
    }, [teams, statusFilter]);

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

    const handleToggleDisbanded = async (teamId: string, teamName: string, currentStatus: boolean) => {
        const action = currentStatus ? "restore" : "disband";
        const confirmMessage = currentStatus
            ? `"${teamName}" 팀을 복구하시겠습니까?`
            : `"${teamName}" 팀을 해체 처리하시겠습니까?`;

        if (!confirm(confirmMessage)) return;

        try {
            const supabase = createClient();
            const { error } = await supabase
                .from("teams")
                .update({ is_disbanded: !currentStatus })
                .eq("id", teamId);

            if (error) throw error;

            toast.success(currentStatus ? "팀이 복구되었습니다" : "팀이 해체 처리되었습니다");
            router.refresh();
        } catch (error: any) {
            toast.error(error.message || "상태 변경 실패");
        }
    };

    const winRate = (wins: number, losses: number) => {
        const total = wins + losses;
        if (total === 0) return "0.0";
        return ((wins / total) * 100).toFixed(1);
    };

    // 컨퍼런스 표시 포맷: "2k26 2nd - West" 또는 "-"
    const formatConference = (team: Team) => {
        if (!team.is_current_season || !team.conference) {
            return "-";
        }
        // 시즌 이름 간략화 (예: "KPL 26 2nd season" -> "2k26 2nd")
        const seasonName = team.season?.name || activeSeason?.name || "";
        const shortName = seasonName
            .replace(/KPL\s*/i, "2k")
            .replace(/\s*season/i, "")
            .trim();
        return `${shortName} - ${team.conference}`;
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Teams</h1>
                        <p className="text-muted-foreground">
                            전체 {uniqueTeams.length}개 팀
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Teams</SelectItem>
                                <SelectItem value="active">Active Teams</SelectItem>
                                <SelectItem value="disbanded">Disbanded Teams</SelectItem>
                            </SelectContent>
                        </Select>
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
                                <th className="text-center py-3 px-2">Status</th>
                                <th className="text-center py-3 px-2">Conference</th>
                                <th className="text-center py-3 px-2">W-L</th>
                                <th className="text-center py-3 px-2">Win%</th>
                                <th className="text-center py-3 px-2">Roster</th>
                                <th className="text-left py-3 px-2">Captain</th>
                                <th className="text-right py-3 px-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {uniqueTeams.map((team) => (
                                <tr key={team.id} className="border-b hover:bg-muted/50">
                                    <td className="py-4 px-2">
                                        <div className="flex items-center space-x-3">
                                            {team.logo_url ? (
                                                <img src={team.logo_url} alt={team.name} className="h-8 w-8 object-contain" />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-nba-red flex items-center justify-center text-xs font-bold text-white">
                                                    {team.name.substring(0, 2)}
                                                </div>
                                            )}
                                            <span className={`font-semibold ${team.is_disbanded ? 'line-through text-muted-foreground' : ''}`}>
                                                {team.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        {team.is_disbanded ? (
                                            <Badge variant="secondary" className="text-xs">
                                                Disbanded
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-xs border-green-500 text-green-500">
                                                Active
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        {team.is_current_season && team.conference ? (
                                            <Badge
                                                variant="outline"
                                                className={team.conference === "West" ? "border-nba-blue text-nba-blue" : "border-nba-red text-nba-red"}
                                            >
                                                {formatConference(team)}
                                            </Badge>
                                        ) : team.is_current_season && !team.conference ? (
                                            <Badge variant="outline" className="text-orange-500 border-orange-500">
                                                No Conference
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-xs">
                                                Not Participating
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="py-4 px-2 text-center font-medium">
                                        {team.is_current_season ? `${team.wins}-${team.losses}` : "-"}
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        {team.is_current_season ? `${winRate(team.wins, team.losses)}%` : "-"}
                                    </td>
                                    <td className="py-4 px-2 text-center">
                                        <span className="text-sm">
                                            {team.is_current_season ? `${team.roster_count || 0}` : "-"}
                                        </span>
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
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleToggleDisbanded(team.id, team.name, team.is_disbanded)}
                                                className={team.is_disbanded ? "text-green-600" : "text-orange-600"}
                                            >
                                                {team.is_disbanded ? (
                                                    <>
                                                        <ArchiveRestore className="mr-1 h-3 w-3" />
                                                        Restore
                                                    </>
                                                ) : (
                                                    <>
                                                        <Archive className="mr-1 h-3 w-3" />
                                                        Disband
                                                    </>
                                                )}
                                            </Button>
                                            <Button variant="outline" size="sm" className="text-destructive" onClick={() => handleDelete(team.id, team.name)}>Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {uniqueTeams.length === 0 && (
                        <div className="py-12 text-center">
                            <p className="text-muted-foreground mb-4">등록된 팀이 없습니다</p>
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
