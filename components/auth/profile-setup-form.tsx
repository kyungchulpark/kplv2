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
  const [youtubeChannel, setYoutubeChannel] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          psn_id: psnId,
          youtube_channel: youtubeChannel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error) {
          setError(data.error);
        } else {
          setError("An error occurred while setting up profile.");
        }
        setIsLoading(false);
        return;
      }

      // Success
      if (data.merged) {
        // Optional: Show a toast or message about successful merge
        console.log("Profile merged with legacy data!");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Profile setup error:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} disabled />
      </div>

      <div className="space-y-2">
        <Label htmlFor="psn_id">
          PSN ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="psn_id"
          type="text"
          placeholder="Enter your PlayStation Network ID"
          value={psnId}
          onChange={(e) => setPsnId(e.target.value)}
          required
          minLength={3}
          maxLength={16}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          Enter your in-game PSN ID (3-16 characters)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="youtube_channel">
          YouTube Channel <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          id="youtube_channel"
          type="url"
          placeholder="Enter your YouTube channel URL"
          value={youtubeChannel}
          onChange={(e) => setYoutubeChannel(e.target.value)}
          disabled={isLoading}
        />
        <p className="text-xs text-muted-foreground">
          e.g., https://www.youtube.com/@channelname or https://www.youtube.com/c/channelname
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
            Creating...
          </>
        ) : (
          "Create Profile"
        )}
      </Button>
    </form>
  );
}
