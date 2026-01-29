"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resizeImageFile } from "@/lib/image-resize";

interface ProfileEditFormProps {
  userId: string;
  currentPsnId: string;
  currentYoutubeChannel: string;
  currentAvatarUrl?: string | null;
}

export function ProfileEditForm({
  userId,
  currentPsnId,
  currentYoutubeChannel,
  currentAvatarUrl,
}: ProfileEditFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [psnId, setPsnId] = useState(currentPsnId);
  const [youtubeChannel, setYoutubeChannel] = useState(currentYoutubeChannel);
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setAvatarFile(file);
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile) return null;

    setIsUploadingAvatar(true);
    try {
      const supabase = createClient();
      const resizedFile = await resizeImageFile(avatarFile, 256);
      const fileExt = resizedFile.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resizedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload avatar");
        return null;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      return publicUrl;
    } catch (err) {
      console.error("Avatar upload error:", err);
      toast.error("An error occurred while uploading avatar");
      return null;
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Upload avatar if changed
      let newAvatarUrl = currentAvatarUrl;
      if (avatarFile) {
        const uploadedUrl = await handleUploadAvatar();
        if (uploadedUrl) {
          newAvatarUrl = uploadedUrl;
        } else {
          setIsLoading(false);
          return;
        }
      }

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          psn_id: psnId,
          youtube_channel: youtubeChannel || null,
          avatar_url: newAvatarUrl,
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
      setAvatarFile(null);
      router.refresh();
    } catch (err) {
      console.error("Profile update error:", err);
      toast.error("An error occurred while updating profile.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanges =
    psnId !== currentPsnId ||
    youtubeChannel !== currentYoutubeChannel ||
    avatarFile !== null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar Upload */}
      <div className="space-y-2">
        <Label>Profile Picture</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={avatarUrl || undefined} alt="Profile" />
            <AvatarFallback className="text-2xl">
              {psnId?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploadingAvatar}
            >
              <Upload className="mr-2 h-4 w-4" />
              {avatarFile ? "Change Image" : "Upload Image"}
            </Button>
            {avatarFile && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarUrl(currentAvatarUrl || "");
                }}
                disabled={isLoading || isUploadingAvatar}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload a profile picture (Max 2MB, JPG/PNG)
        </p>
      </div>

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
