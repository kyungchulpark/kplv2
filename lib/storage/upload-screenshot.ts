import { createClient } from "@/utils/supabase/client";

/**
 * Upload match result screenshot to Supabase Storage
 *
 * @param file - Screenshot file to upload
 * @param matchId - Match ID (used in filename)
 * @returns Public URL of uploaded screenshot
 */
export async function uploadScreenshot(
  file: File,
  matchId: string
): Promise<string> {
  const supabase = createClient();

  // Generate unique filename: {matchId}_{timestamp}.{ext}
  const fileExt = file.name.split(".").pop();
  const fileName = `${matchId}_${Date.now()}.${fileExt}`;

  // Upload to match-screenshots bucket
  const { error: uploadError } = await supabase.storage
    .from("match-screenshots")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`스크린샷 업로드 실패: ${uploadError.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("match-screenshots").getPublicUrl(fileName);

  return publicUrl;
}

/**
 * Delete match screenshot from Supabase Storage
 *
 * @param screenshotUrl - Full URL of screenshot to delete
 * @returns Success boolean
 */
export async function deleteScreenshot(
  screenshotUrl: string
): Promise<boolean> {
  const supabase = createClient();

  // Extract filename from URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/match-screenshots/{filename}
  const urlParts = screenshotUrl.split("/");
  const fileName = urlParts[urlParts.length - 1];

  if (!fileName) {
    return false;
  }

  const { error } = await supabase.storage
    .from("match-screenshots")
    .remove([fileName]);

  return !error;
}
