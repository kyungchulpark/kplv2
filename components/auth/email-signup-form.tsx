"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Mail, Lock, Check, X } from "lucide-react";
import Link from "next/link";

export function EmailSignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password strength checks
  const passwordChecks = {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = Object.values(passwordChecks).every((check) => check);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isPasswordValid) {
      setError("비밀번호가 요구사항을 충족하지 않습니다.");
      return;
    }

    if (!passwordsMatch) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);

    try {
      await signUpWithEmail(email, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mx-auto">
          <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">이메일을 확인해주세요</h3>
          <p className="text-sm text-muted-foreground">
            <strong>{email}</strong>로 인증 이메일을 보냈습니다.
            <br />
            이메일의 링크를 클릭하여 회원가입을 완료해주세요.
          </p>
        </div>
        <Button onClick={() => router.push("/auth/signin")} variant="outline" className="w-full">
          로그인 페이지로 이동
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">이메일</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Password strength indicator */}
        {password && (
          <div className="space-y-1 text-xs">
            <PasswordCheck label="최소 8자 이상" checked={passwordChecks.length} />
            <PasswordCheck label="소문자 포함" checked={passwordChecks.hasLower} />
            <PasswordCheck label="대문자 포함" checked={passwordChecks.hasUpper} />
            <PasswordCheck label="숫자 포함" checked={passwordChecks.hasNumber} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">비밀번호 확인</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            className="pl-10"
          />
        </div>
        {confirmPassword && (
          <PasswordCheck
            label={passwordsMatch ? "비밀번호가 일치합니다" : "비밀번호가 일치하지 않습니다"}
            checked={passwordsMatch}
          />
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !isPasswordValid || !passwordsMatch}
      >
        {isLoading ? "회원가입 중..." : "회원가입"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        이미 계정이 있으신가요?{" "}
        <Link href="/auth/signin" className="text-primary hover:underline">
          로그인
        </Link>
      </div>
    </form>
  );
}

function PasswordCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <X className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={checked ? "text-green-600" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
