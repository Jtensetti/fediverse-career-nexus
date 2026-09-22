import { requireUser } from '../_shared/user-auth.ts';
import { serviceClient, federationHeaders } from '../_shared/local-actor.ts';
import { mediaBuckets } from '../_shared/deletion.ts';

Deno.serve(async req => {
  const headers = { ...federationHeaders, 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'cross-origin' };
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  if (!['GET', 'HEAD'].includes(req.method)) return new Response(null, { status: 405, headers });
  const url = new URL(req.url);
  const match = url.pathname.match(/\/public-media\/([^/]+)\/(.+)$/);
  if (!match || !mediaBuckets.has(match[1])) return new Response(null, { status: 404, headers });
  let name: string;
  try { name = match[2].split('/').map(decodeURIComponent).join('/'); }
  catch { return new Response(null, { status: 400, headers }); }
  if (name.length > 1024 || name.split('/').some(part => ['', '.', '..'].includes(part))) return new Response(null, { status: 400, headers });
  const canonical = `${Deno.env.get('SUPABASE_URL')}/functions/v1/public-media/${match[1]}/${name.split('/').map(encodeURIComponent).join('/')}`;
  try {
    const db = serviceClient(10000);
    const { data, error } = await db.rpc('resolve_public_media', { p_bucket: match[1], p_name: name, p_url: canonical });
    if (error) throw error;
    let asset = data?.[0];
    if (!asset && req.headers.has('authorization')) {
      try {
        const { user } = await requireUser(req);
        const { data: own, error } = await db.rpc('resolve_private_media', { p_user_id: user.id, p_bucket: match[1], p_name: name });
        if (error) throw error;
        asset = own?.[0];
      } catch { return new Response(null, { status: 404, headers }); }
    }
    if (!asset) return new Response(null, { status: 404, headers });
    if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(asset.mime_type || '')) return new Response(null, { status: 415, headers });
    const { data: info, error: infoError } = await db.storage.from(match[1]).info(name);
    if (infoError || !info || typeof info.size !== 'number' || info.size > 25 * 1024 * 1024) return new Response(null, { status: 413, headers });
    if (req.method === 'HEAD') return new Response(null, { headers: { ...headers, 'Content-Type': asset.mime_type } });
    const { data: file, error: fileError } = await db.storage.from(match[1]).download(name);
    if (fileError || !file) return new Response(null, { status: 404, headers });
    return new Response(file, { headers: { ...headers, 'Content-Type': asset.mime_type } });
  } catch { return new Response(null, { status: 503, headers }); }
});
