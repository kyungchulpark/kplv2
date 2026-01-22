import { redirect } from "next/navigation";
import { getSession } from "@/utils/supabase/server";
import { EmailSignUpForm } from "@/components/auth/email-signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SignUpPage() {
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
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Join the Korea Proam League and participate in the competition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailSignUpForm />
        </CardContent>
      </Card>
    </div>
  );
}
