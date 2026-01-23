"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Upload,
  Loader2,
  UserPlus,
  Trash2,
  AlertCircle,
  CheckCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface Player {
  id: string;
  psn_id: string;
  avatar_url: string | null;
}

interface RosterMember {
  id: string;
  player_id: string;
  jersey_number: number | null;
  position: string | null;
  player: Player;
}

export default function TeamManagePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [teamId, setTeamId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [roster, setRoster] = useState<RosterMember[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Logo upload states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Add player dialog states
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [position, setPosition] = useState("");
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [playerSearch, setPlayerSearch] = useState("");

  useEffect(() => {
    params.then((resolvedParams) => {
      setTeamId(resolvedParams.id);
      loadData(resolvedParams.id);
    });
  }, []);

  const loadData = async (id: string) => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Get current user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push("/auth/signin");
        return;
      }
      setUser(currentUser);

      // Get team details
      const { data: teamData, error: teamError } = await supabase
        .from("teams")
        .select(
          `
          *,
          season:seasons(id, name)
        `
        )
        .eq("id", id)
        .single();

      if (teamError || !teamData) {
        setError("팀을 찾을 수 없습니다.");
        return;
      }

      // Check if user is captain
      if (teamData.captain_id !== currentUser.id) {
        setError("Only the team captain can manage the team.");
        return;
      }

      setTeam(teamData);
      setActiveSeason(teamData.season);
      setLogoPreview(teamData.logo_url);

      // Get team roster
      const { data: rosterData } = await supabase
        .from("team_rosters")
        .select(
          `
          id,
          player_id,
          jersey_number,
          position,
          player:profiles!team_rosters_player_id_fkey(
            id,
            psn_id,
            avatar_url
          )
        `
        )
        .eq("team_id", id)
        .eq("is_active", true)
        .order("jersey_number", { ascending: true });

      setRoster(rosterData || []);

      // Get available players (not in any roster)
      const rosterPlayerIds = rosterData?.map((r) => r.player_id) || [];

      const { data: allPlayers } = await supabase
        .from("profiles")
        .select("id, psn_id, avatar_url");

      // Filter out players already in ANY team roster
      const { data: allRosters } = await supabase
        .from("team_rosters")
        .select("player_id")
        .eq("is_active", true);

      const takenPlayerIds = allRosters?.map((r) => r.player_id) || [];

      // Available players: not in any active roster
      const available =
        allPlayers?.filter((p) => !takenPlayerIds.includes(p.id)) || [];

      // Sort alphabetically by psn_id (대소문자 구분 없이)
      available.sort((a, b) =>
        a.psn_id.toLowerCase().localeCompare(b.psn_id.toLowerCase())
      );

      setAvailablePlayers(available);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("로고 파일은 2MB 이하여야 합니다.");
        return;
      }

      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드 가능합니다.");
        return;
      }

      setLogoFile(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile || !team) return;

    setUploadingLogo(true);
    const supabase = createClient();

    try {
      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${team.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(fileName, logoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("team-logos").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("teams")
        .update({ logo_url: publicUrl })
        .eq("id", team.id);

      if (updateError) throw updateError;

      setTeam({ ...team, logo_url: publicUrl });
      setLogoFile(null);
      toast.success("로고가 업데이트되었습니다.");
    } catch (err: any) {
      toast.error(`로고 업로드 실패: ${err.message}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAddPlayer = async () => {
    if (!selectedPlayerId || !team) {
      toast.error("선수를 선택하세요.");
      return;
    }

    setAddingPlayer(true);
    const supabase = createClient();

    try {
      // Double-check if player is already in another team (safety check)
      const { data: existingRoster } = await supabase
        .from("team_rosters")
        .select("team:teams(id, name)")
        .eq("season_id", team.season_id)
        .eq("player_id", selectedPlayerId)
        .eq("is_active", true)
        .single();

      if (existingRoster && (existingRoster as any).team) {
        toast.error(`이 선수는 이미 다른 팀에 소속되어 있습니다: ${(existingRoster as any).team.name}`);
        setAddingPlayer(false);
        return;
      }

      const { error: insertError } = await supabase.from("team_rosters").insert({
        team_id: team.id,
        season_id: team.season_id,
        player_id: selectedPlayerId,
        jersey_number: null,
        position: position || null,
        is_active: true,
      });

      if (insertError) throw insertError;

      toast.success("Player added successfully");
      setAddPlayerOpen(false);
      setSelectedPlayerId("");
      setPosition("");
      setPlayerSearch("");
      loadData(teamId);
    } catch (err: any) {
      toast.error(`선수 추가 실패: ${err.message}`);
    } finally {
      setAddingPlayer(false);
    }
  };

  const handleRemovePlayer = async (rosterId: string) => {
    if (!confirm("정말로 이 선수를 로스터에서 제거하시겠습니까?")) return;

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("team_rosters")
        .update({ is_active: false })
        .eq("id", rosterId);

      if (error) throw error;

      toast.success("선수가 제거되었습니다.");
      loadData(teamId);
    } catch (err: any) {
      toast.error(`선수 제거 실패: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "팀을 불러올 수 없습니다."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">
              {team.name} - {activeSeason?.name || "Waiting for league entry"}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push(`/teams/${teamId}`)}>
            View Team Page
          </Button>
        </div>

        {/* Logo Management */}
        <Card>
          <CardHeader>
            <CardTitle>Team Logo</CardTitle>
            <CardDescription>Upload or change your team logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              {/* Current Logo Preview */}
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Team logo"
                    className="h-32 w-32 object-contain rounded-lg border-2"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-lg border-2 border-dashed flex items-center justify-center text-4xl font-bold bg-muted">
                    {team.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-3">
                <input
                  type="file"
                  id="logo-upload"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("logo-upload")?.click()}
                    disabled={uploadingLogo}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {logoFile ? "Choose Another File" : "Choose Logo"}
                  </Button>
                  {logoFile && (
                    <Button onClick={handleLogoUpload} disabled={uploadingLogo}>
                      {uploadingLogo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Update Logo
                        </>
                      )}
                    </Button>
                  )}
                </div>
                {logoFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {logoFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WEBP supported (max 2MB)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roster Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Roster Management</CardTitle>
                <CardDescription>
                  Add and manage team members ({roster.length} players)
                </CardDescription>
              </div>
              <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Player
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Player</DialogTitle>
                    <DialogDescription>
                      Search and select a player to add to the roster
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Search Player *</Label>
                      <Input
                        placeholder="Type PSN ID to search..."
                        value={playerSearch}
                        onChange={(e) => setPlayerSearch(e.target.value)}
                        className="mb-2"
                      />
                      <div className="max-h-[200px] overflow-y-auto border rounded-md">
                        {availablePlayers
                          .filter((p) =>
                            p.psn_id.toLowerCase().includes(playerSearch.toLowerCase())
                          )
                          .slice(0, 50)
                          .map((player) => (
                            <div
                              key={player.id}
                              onClick={() => {
                                setSelectedPlayerId(player.id);
                                setPlayerSearch(player.psn_id);
                              }}
                              className={`px-3 py-2 cursor-pointer hover:bg-accent ${
                                selectedPlayerId === player.id ? "bg-accent" : ""
                              }`}
                            >
                              {player.psn_id}
                            </div>
                          ))}
                        {availablePlayers.filter((p) =>
                          p.psn_id.toLowerCase().includes(playerSearch.toLowerCase())
                        ).length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            No players found
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="position">Position</Label>
                      <Select value={position} onValueChange={setPosition}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select position (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PG">PG (Point Guard)</SelectItem>
                          <SelectItem value="SG">SG (Shooting Guard)</SelectItem>
                          <SelectItem value="SF">SF (Small Forward)</SelectItem>
                          <SelectItem value="PF">PF (Power Forward)</SelectItem>
                          <SelectItem value="C">C (Center)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAddPlayerOpen(false);
                        setPlayerSearch("");
                        setSelectedPlayerId("");
                        setPosition("");
                      }}
                      disabled={addingPlayer}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddPlayer} disabled={addingPlayer || !selectedPlayerId}>
                      {addingPlayer ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Player"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {roster.length > 0 ? (
              <div className="space-y-2">
                {roster.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={member.player.avatar_url || undefined} />
                        <AvatarFallback>
                          {member.player.psn_id.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{member.player.psn_id}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.position || "No position assigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePlayer(member.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No players registered</p>
                <p className="text-sm">Click the button above to add players</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
