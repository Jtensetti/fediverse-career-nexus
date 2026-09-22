import { supabase } from '@/integrations/supabase/client';

const base = import.meta.env.VITE_SUPABASE_URL.replace(/\/$/, '');
const prefix = `${base}/functions/v1/public-media/`;
export function publicMediaUrl(bucket: string, name: string): string {
  return prefix + encodeURIComponent(bucket) + '/' + name.split('/').map(encodeURIComponent).join('/');
}
export const isNoltoMedia = (url: string) => url.startsWith(prefix);

// Private drafts use an authenticated request, never a bearer token or signed URL in markup.
export async function fetchOwnMedia(url: string, signal: AbortSignal): Promise<Blob | null> {
  if (!isNoltoMedia(url)) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const response = await fetch(url, { signal, cache: 'no-store', redirect: 'error', credentials: 'omit',
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
  if (!response.ok || !/^image\/(jpeg|png|webp|gif|avif)(;|$)/.test(response.headers.get('content-type') || '')) return null;
  return response.blob();
}
