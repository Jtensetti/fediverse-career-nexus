import { UserFacingError } from '@/lib/userFacingError';
import { publicMediaUrl } from "@/lib/media";
import { supabase } from "@/lib/supabase";

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
  const filePath = `${companyId}/${type}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, file, {
      cacheControl: "0",
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading company image:", uploadError);
    throw new UserFacingError('runtimeErrors.imageUpload');
  }

  return publicMediaUrl(BUCKET, filePath);
}

/**
 * Delete a company image from storage by its full URL.
 */
export async function deleteCompanyImage(imageUrl: string): Promise<void> {
  const url = new URL(imageUrl);
  if (url.origin !== new URL(import.meta.env.VITE_SUPABASE_URL).origin) return;
  const prefix = [`/functions/v1/public-media/${BUCKET}/`, `/storage/v1/object/public/${BUCKET}/`]
    .find(value => url.pathname.startsWith(value));
  if (!prefix) return;
  const name = url.pathname.slice(prefix.length).split('/').map(decodeURIComponent).join('/');
  const { error } = await supabase.functions.invoke('request-deletion', { body: { kind: 'file', bucket: BUCKET, name } });
  if (error) throw new UserFacingError('runtimeErrors.imageCleanup');
}
