import { redirect } from "next/navigation";
import { getCurrentUser } from "@/utils/supabase/server";
import { ProfileSetupForm } from "@/components/auth/profile-setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfileSetupPage() {
  const user = await getCurrentUser();

  // Redirect if not authenticated
  if (!user) {
    redirect("/auth/signin");
  }

  // Redirect if profile already exists
  if (user.profile) {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">프로필 설정</CardTitle>
          <CardDescription>
            Korea Proam League에 참여하기 위해 프로필을 완성해주세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSetupForm userId={user.id} email={user.email || ""} />
        </CardContent>
      </Card>
    </div>
  );
}
