import { supabase } from '@/lib/supabase';
import { publicMediaUrl } from '@/lib/media';
import type { UploadedPostImage } from '@/lib/imageDraft';

export async function uploadPostImage(file: File): Promise<UploadedPostImage> {
  if (file.type !== 'image/jpeg' || file.size > 500 * 1024) throw new Error('Bilden måste komprimeras före uppladdning.');
  const { data, error } = await supabase.rpc('begin_post_image_upload');
  const draft = data?.[0];
  if (error || !draft) throw new Error('Kunde inte starta bilduppladdningen. Försök igen.');
  try {
    const { error: uploadError } = await supabase.storage.from('posts').upload(draft.storage_path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { error: completeError } = await supabase.rpc('complete_post_image_upload', { p_id: draft.id });
    if (completeError) throw completeError;
    return { id: draft.id, path: draft.storage_path, url: publicMediaUrl('posts', draft.storage_path), mediaType: file.type, size: file.size };
  } catch {
    await supabase.rpc('discard_post_image_upload', { p_id: draft.id });
    throw new Error('Bilden kunde inte laddas upp. Kontrollera anslutningen och försök igen.');
  }
}

export async function discardPostImage(image: UploadedPostImage): Promise<void> {
  const { error } = await supabase.rpc('discard_post_image_upload', { p_id: image.id });
  if (error) throw error;
}
