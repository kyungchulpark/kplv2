import { redirect } from "next/navigation";
import { getSession } from "@/utils/supabase/server";
import { SignInButton } from "@/components/auth/signin-button";
import { EmailSignInForm } from "@/components/auth/email-signin-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SignInPage() {
  // Redirect if already logged in
  const session = await getSession();
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-nba-red font-bold text-white text-2xl">
            KPL
          </div>
          <CardTitle className="text-2xl">Korea Proam League</CardTitle>
          <CardDescription>
            Welcome to the NBA 2K Online League
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              {/* Google OAuth - Hidden but not deleted */}
              <TabsTrigger value="google" className="hidden">Google</TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <EmailSignInForm />
            </TabsContent>

            {/* Google OAuth - Hidden but not deleted */}
            <TabsContent value="google" className="space-y-4 mt-4 hidden">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Google 계정으로 간편하게 로그인하세요
                </p>
                <SignInButton />
              </div>
            </TabsContent>
          </Tabs>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Features after sign in
              </span>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center">
              <span className="mr-2">✓</span>
              View match schedules and results
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span>
              Access player and team statistics
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span>
              Manage your profile and records
            </li>
            <li className="flex items-center">
              <span className="mr-2">✓</span>
              Participate in community activities
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
