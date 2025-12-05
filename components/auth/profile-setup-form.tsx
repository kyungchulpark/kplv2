"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";

interface ProfileSetupFormProps {
  userId: string;
  email: string;
}

export function ProfileSetupForm({ userId, email }: ProfileSetupFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [psnId, setPsnId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create profile
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        email,
        psn_id: psnId,
        role: "user",
      });

      if (insertError) {
        if (insertError.code === "23505") {
          // Unique constraint violation
          setError("이미 사용 중인 PSN ID입니다.");
        } else {
          setError("프로필 생성 중 오류가 발생했습니다.");
        }
        setIsLoading(false);
        return;
      }

      // Success - redirect to home
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Profile setup error:", err);
      setError("프로필 생성 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <Input id="email" type="email" value={email} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="psn_id">
          PSN ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="psn_id"
          type="text"
          placeholder="PlayStation Network ID를 입력하세요"
          value={psnId}
          onChange={(e) => setPsnId(e.target.value)}
          required
          minLength={3}
          maxLength={16}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          게임 내 사용하는 PSN ID를 입력해주세요 (3-16자)
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading || !psnId}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            생성 중...
          </>
        ) : (
          "프로필 생성"
        )}
      </Button>
    </form>
  );
}
