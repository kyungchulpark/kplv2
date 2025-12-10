"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Trash2, UserCog, Shield, User as UserIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type User = {
  id: string;
  email: string;
  psn_id: string | null;
  role: string;
  avatar_url: string | null;
  created_at: string;
  captain_of: Array<{ id: string; name: string }>;
  member_of: Array<{ id: string; name: string }>;
};

type UsersManagerProps = {
  users: User[];
};

export function UsersManager({ users: initialUsers }: UsersManagerProps) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editPsnId, setEditPsnId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditPsnId(user.psn_id || "");
    setEditDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;

    setLoading(true);

    try {
      // Call API route instead of direct Supabase update (to bypass RLS)
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: editRole,
          psn_id: editPsnId || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "수정 실패");
      }

      // Update local state
      setUsers(users.map(u =>
        u.id === selectedUser.id
          ? { ...u, role: editRole, psn_id: editPsnId || null }
          : u
      ));

      toast.success("사용자 정보가 수정되었습니다");
      setEditDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "수정 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    setLoading(true);
    const supabase = createClient();

    try {
      // Check if user is captain or member of any team
      if (selectedUser.captain_of.length > 0 || selectedUser.member_of.length > 0) {
        toast.error("팀에 소속된 사용자는 삭제할 수 없습니다. 먼저 팀에서 제거하세요.");
        setDeleteDialogOpen(false);
        setLoading(false);
        return;
      }

      // Delete profile (cascade will handle related data)
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("사용자가 삭제되었습니다");
      setDeleteDialogOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "삭제 실패");
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      admin: { color: "bg-red-500/10 text-red-500 border-red-500/20", label: "관리자" },
      staff: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "스태프" },
      user: { color: "bg-green-500/10 text-green-500 border-green-500/20", label: "사용자" },
    };
    const badge = badges[role] || badges.user;
    return (
      <Badge variant="outline" className={badge.color}>
        {badge.label}
      </Badge>
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.psn_id || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이메일 또는 PSN ID 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
                <SelectItem value="staff">스태프</SelectItem>
                <SelectItem value="user">사용자</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-sm">
                  <th className="text-left py-3 px-2">사용자</th>
                  <th className="text-left py-3 px-2">PSN ID</th>
                  <th className="text-center py-3 px-2">권한</th>
                  <th className="text-left py-3 px-2">소속 팀</th>
                  <th className="text-center py-3 px-2">가입일</th>
                  <th className="text-right py-3 px-2">작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="bg-muted">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <span className="text-sm font-medium">
                        {user.psn_id || "-"}
                      </span>
                    </td>
                    <td className="py-4 px-2 text-center">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        {user.captain_of.map((team) => (
                          <div key={team.id} className="text-xs">
                            <Shield className="inline h-3 w-3 mr-1 text-yellow-500" />
                            {team.name}
                          </div>
                        ))}
                        {user.member_of.map((team) => (
                          <div key={team.id} className="text-xs text-muted-foreground">
                            • {team.name}
                          </div>
                        ))}
                        {user.captain_of.length === 0 && user.member_of.length === 0 && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-2 text-center text-sm">
                      {new Date(user.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredUsers.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">사용자가 없습니다</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 수정</DialogTitle>
            <DialogDescription>
              {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="psn_id">PSN ID</Label>
              <Input
                id="psn_id"
                value={editPsnId}
                onChange={(e) => setEditPsnId(e.target.value)}
                placeholder="PSN ID 입력"
              />
            </div>
            <div>
              <Label htmlFor="role">권한</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">사용자</SelectItem>
                  <SelectItem value="staff">스태프</SelectItem>
                  <SelectItem value="admin">관리자</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button onClick={handleSaveEdit} disabled={loading}>
              {loading ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 사용자를 삭제하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm">
              <strong>이메일:</strong> {selectedUser?.email}
            </p>
            <p className="text-sm">
              <strong>PSN ID:</strong> {selectedUser?.psn_id || "-"}
            </p>
            {(selectedUser?.captain_of.length || 0) > 0 && (
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-sm text-destructive font-medium">
                  이 사용자는 팀장입니다:
                </p>
                <ul className="text-sm list-disc list-inside">
                  {selectedUser?.captain_of.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              </div>
            )}
            {(selectedUser?.member_of.length || 0) > 0 && (
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <p className="text-sm font-medium">
                  이 사용자는 팀원입니다:
                </p>
                <ul className="text-sm list-disc list-inside">
                  {selectedUser?.member_of.map((team) => (
                    <li key={team.id}>{team.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={loading}
            >
              {loading ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
