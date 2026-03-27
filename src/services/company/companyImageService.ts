import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

const BUCKET = "company-assets";

/**
 * Upload a company image (logo or banner) to storage.
 * Files are stored under: company-assets/{companyId}/{type}-{uuid}.{ext}
 */
export async function uploadCompanyImage(
  companyId: string,
  file: File,
  type: "logo" | "banner"
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filePath = `${companyId}/${type}-${uuidv4()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading company image:", uploadError);
    throw new Error(uploadError.message || "Failed to upload image");
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Delete a company image from storage by its full URL.
 */
export async function deleteCompanyImage(imageUrl: string): Promise<void> {
  // Extract the path from the full URL
  const bucketUrl = `/storage/v1/object/public/${BUCKET}/`;
  const idx = imageUrl.indexOf(bucketUrl);
  if (idx === -1) return;

  const filePath = imageUrl.substring(idx + bucketUrl.length);

  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Error deleting company image:", error);
  }
}
