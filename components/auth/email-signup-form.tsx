"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail, checkPsnIdAvailability } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Mail, Lock, Check, X, Loader2 } from "lucide-react";
import Link from "next/link";

export function EmailSignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [psnId, setPsnId] = useState("");
  const [youtubeChannel, setYoutubeChannel] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingPsnId, setCheckingPsnId] = useState(false);
  const [psnIdAvailable, setPsnIdAvailable] = useState<boolean | null>(null);

  // Check PSN ID availability with debounce
  useEffect(() => {
    if (!psnId || psnId.length < 3 || psnId.length > 16) {
      setPsnIdAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingPsnId(true);
      try {
        const available = await checkPsnIdAvailability(psnId);
        setPsnIdAvailable(available);
      } catch (err) {
        console.error("Error checking PSN ID:", err);
        setPsnIdAvailable(null);
      } finally {
        setCheckingPsnId(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [psnId]);

  // Password strength checks
  const passwordChecks = {
    length: password.length >= 8,
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = Object.values(passwordChecks).every((check) => check);
  const isPsnIdValid = psnId.length >= 3 && psnId.length <= 16 && psnIdAvailable === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!isPsnIdValid) {
      setError("Please enter a valid and available PSN ID.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await signUpWithEmail(email, password, psnId, youtubeChannel || null);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred during registration.");
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
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="text-sm text-muted-foreground">
            We sent a verification email to <strong>{email}</strong>.
            <br />
            Click the link in the email to complete your registration.
          </p>
        </div>
        <Button onClick={() => router.push("/auth/signin")} variant="outline" className="w-full">
          Go to Sign In
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
        <Label htmlFor="email">Email</Label>
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
        <Label htmlFor="psn_id">
          PSN ID <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <Input
            id="psn_id"
            type="text"
            placeholder="PlayStation Network ID"
            value={psnId}
            onChange={(e) => setPsnId(e.target.value)}
            required
            minLength={3}
            maxLength={16}
            disabled={isLoading}
            className={
              psnId.length >= 3
                ? psnIdAvailable === true
                  ? "pr-10 border-green-500 focus-visible:ring-green-500"
                  : psnIdAvailable === false
                  ? "pr-10 border-red-500 focus-visible:ring-red-500"
                  : "pr-10"
                : ""
            }
          />
          {psnId.length >= 3 && (
            <div className="absolute right-3 top-3">
              {checkingPsnId ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : psnIdAvailable === true ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : psnIdAvailable === false ? (
                <X className="h-4 w-4 text-red-600" />
              ) : null}
            </div>
          )}
        </div>
        {psnId.length >= 3 && psnIdAvailable === false && (
          <p className="text-xs text-red-600">This PSN ID is already taken</p>
        )}
        {psnId.length >= 3 && psnIdAvailable === true && (
          <p className="text-xs text-green-600">This PSN ID is available</p>
        )}
        {psnId.length < 3 && (
          <p className="text-xs text-muted-foreground">
            Enter your in-game PSN ID (3-16 characters)
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube_channel">
          YouTube Channel <span className="text-xs text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          id="youtube_channel"
          type="text"
          placeholder="https://youtube.com/@yourchannel or Channel Name"
          value={youtubeChannel}
          onChange={(e) => setYoutubeChannel(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Enter your YouTube channel URL or name (optional)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
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
            <PasswordCheck label="At least 8 characters" checked={passwordChecks.length} />
            <PasswordCheck label="Contains lowercase" checked={passwordChecks.hasLower} />
            <PasswordCheck label="Contains uppercase" checked={passwordChecks.hasUpper} />
            <PasswordCheck label="Contains number" checked={passwordChecks.hasNumber} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
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
            label={passwordsMatch ? "Passwords match" : "Passwords do not match"}
            checked={passwordsMatch}
          />
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !isPasswordValid || !passwordsMatch || !isPsnIdValid || checkingPsnId}
      >
        {isLoading ? "Signing up..." : "Sign Up"}
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-primary hover:underline">
          Sign In
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
