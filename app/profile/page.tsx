import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/auth/signout-button";
import { ProfileEditForm } from "@/components/profile/profile-edit-form";
import { PsnIdHistory } from "@/components/profile/psn-id-history";
import { User, Mail, Shield, Calendar, Youtube, BarChart3 } from "lucide-react";
import Link from "next/link";

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
      admin: "Admin",
      staff: "Staff",
      user: "User",
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
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and settings
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your registered member information in KPL
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
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Role:</span>
                <span className="font-medium">
                  {user.profile?.role === "admin"
                    ? "Admin"
                    : user.profile?.role === "staff"
                    ? "Staff"
                    : "User"}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Youtube className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">YouTube Channel:</span>
                {user.profile?.youtube_channel ? (
                  <a
                    href={user.profile.youtube_channel}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-nba-red hover:underline"
                  >
                    View Channel
                  </a>
                ) : (
                  <span className="font-medium text-muted-foreground">Not set</span>
                )}
              </div>
              <div className="flex items-center space-x-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Joined:</span>
                <span className="font-medium">
                  {user.profile?.created_at
                    ? new Date(user.profile.created_at).toLocaleDateString("en-US")
                    : "No information"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Stats</CardTitle>
            <CardDescription>
              View your game performance and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/players/${user.id}`}>
              <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-5 w-5 text-nba-red" />
                  <div>
                    <p className="font-medium">View Performance Stats</p>
                    <p className="text-sm text-muted-foreground">
                      Check your season averages and recent games
                    </p>
                  </div>
                </div>
                <span className="text-nba-red">→</span>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileEditForm
              userId={user.id}
              currentPsnId={user.profile?.psn_id || ""}
              currentYoutubeChannel={user.profile?.youtube_channel || ""}
              currentAvatarUrl={user.profile?.avatar_url}
            />
          </CardContent>
        </Card>

        {/* PSN ID History */}
        <PsnIdHistory userId={user.id} currentPsnId={user.profile?.psn_id || ""} />

        <Card>
          <CardHeader>
            <CardTitle>Account Management</CardTitle>
            <CardDescription>
              Account settings and sign out
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
