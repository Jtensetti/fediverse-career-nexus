import { supabase } from '@/lib/supabase';
import { publicMediaUrl } from '@/lib/media';
import { profileAppearanceSchema, validProfileImage, type ProfileAppearance, type ProfileImages } from '@/lib/profileDraft';

/** Files stay in the browser until Save. The profile switches images and text in one update. */
export async function saveProfileAppearance(draft: ProfileAppearance, images: ProfileImages): Promise<void> {
  const fields = profileAppearanceSchema.parse(draft);
  for (const file of Object.values(images)) if (file && !validProfileImage(file)) throw new Error('Invalid image');
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Sign in to edit your profile');
  const uploaded: string[] = [];
  const urls: { avatar_url?: string | null; header_url?: string | null } = {};
  try {
    for (const kind of ['avatar', 'header'] as const) {
      const file = images[kind];
      if (file === undefined) continue;
      if (file === null) { urls[`${kind}_url`] = null; continue; }
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const path = `${user.id}/${kind}-${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      uploaded.push(path);
      urls[`${kind}_url`] = publicMediaUrl('avatars', path);
    }
    const { data, error } = await supabase.from('profiles')
      .update({ ...fields, ...urls, updated_at: new Date().toISOString() }).eq('id', user.id).select('id').single();
    if (error || !data) throw error ?? new Error('Profile could not be saved');
  } catch (error) {
    // Do not remove an image that an ambiguously completed profile write might now reference.
    // Confirm stored references before cleaning up unsuccessful uploads.
    if (uploaded.length) {
      const { data, error: readError } = await supabase.from('profiles').select('avatar_url,header_url').eq('id', user.id).single();
      if (!readError && data) {
        const unused = uploaded.filter(path => ![data.avatar_url, data.header_url].includes(publicMediaUrl('avatars', path)));
        if (unused.length) await supabase.storage.from('avatars').remove(unused);
      }
    }
    throw error;
  }
}
