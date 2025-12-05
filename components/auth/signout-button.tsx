"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/utils/supabase/client";
import { LogOut, Loader2 } from "lucide-react";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignOut}
      disabled={isLoading}
      variant="destructive"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          로그아웃 중...
        </>
      ) : (
        <>
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </>
      )}
    </Button>
  );
}
