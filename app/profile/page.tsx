import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/auth/signout-button";
import { User, Mail, Shield, Calendar } from "lucide-react";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: "bg-red-500/10 text-red-500 border-red-500/20",
      staff: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      user: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    const labels = {
      admin: "관리자",
      staff: "스태프",
      user: "사용자",
    };
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
          badges[role as keyof typeof badges]
        }`}
      >
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">내 프로필</h1>
          <p className="text-muted-foreground">
            계정 정보 및 설정을 관리합니다
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>계정 정보</CardTitle>
            <CardDescription>
              KPL에 등록된 회원 정보입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-nba-red text-2xl font-bold text-white">
                {user.profile?.psn_id?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">
                    {user.profile?.psn_id || "Unknown"}
                  </h2>
                  {user.profile?.role &&
                    getRoleBadge(user.profile.role)}
                </div>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-3 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">PSN ID:</span>
                <span className="font-medium">{user.profile?.psn_id}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">이메일:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">권한:</span>
                <span className="font-medium">
                  {user.profile?.role === "admin"
                    ? "관리자"
                    : user.profile?.role === "staff"
                    ? "스태프"
                    : "사용자"}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">가입일:</span>
                <span className="font-medium">
                  {user.profile?.created_at
                    ? new Date(user.profile.created_at).toLocaleDateString("ko-KR")
                    : "정보 없음"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>계정 관리</CardTitle>
            <CardDescription>
              계정 설정 및 로그아웃
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignOutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
