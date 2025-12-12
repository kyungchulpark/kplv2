"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProfileEditFormProps {
  userId: string;
  currentPsnId: string;
  currentYoutubeChannel: string;
}

export function ProfileEditForm({
  userId,
  currentPsnId,
  currentYoutubeChannel,
}: ProfileEditFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [psnId, setPsnId] = useState(currentPsnId);
  const [youtubeChannel, setYoutubeChannel] = useState(currentYoutubeChannel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          psn_id: psnId,
          youtube_channel: youtubeChannel || null,
        })
        .eq("id", userId);

      if (updateError) {
        if (updateError.code === "23505") {
          toast.error("PSN ID is already in use.");
        } else {
          toast.error("An error occurred while updating profile.");
        }
        setIsLoading(false);
        return;
      }

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("An error occurred while updating profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    psnId !== currentPsnId || youtubeChannel !== currentYoutubeChannel;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="edit_psn_id">
          PSN ID <span className="text-destructive">*</span>
        </Label>
        <Input
          id="edit_psn_id"
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
        <Label htmlFor="edit_youtube_channel">
          YouTube Channel <span className="text-muted-foreground">(Optional)</span>
        </Label>
        <Input
          id="edit_youtube_channel"
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

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !psnId || !hasChanges}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating...
          </>
        ) : (
          "Update Profile"
        )}
      </Button>
    </form>
  );
}
