import { serviceClient, jsonResponse } from '../_shared/local-actor.ts';
import { postHandler, requireUser, requestBody, uuid, HttpError } from '../_shared/user-auth.ts';
import { encryptedDeletionSnapshot, contentMediaReferences, mediaBuckets } from '../_shared/deletion.ts';

Deno.serve(postHandler(async req => {
  const { user, client } = await requireUser(req);
  const body = await requestBody(req, 2048);
  const { kind, id: rawId } = body;
  if (kind === 'file') {
    const { bucket, name } = body;
    if (typeof bucket !== 'string' || !mediaBuckets.has(bucket) || typeof name !== 'string' || name.length > 1024 ||
        name.split('/').some(part => ['', '.', '..'].includes(part))) throw new HttpError(400, 'Invalid file');
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/public-media/${bucket}/${name.split('/').map(encodeURIComponent).join('/')}`;
    const { data, error } = await serviceClient(10000).rpc('schedule_file_deletion', {
      p_user_id: user.id, p_bucket: bucket, p_name: name, p_url: url,
      p_encrypted_payload: await encryptedDeletionSnapshot('file', `${bucket}/${name}`, { bucket, name }),
    });
    if (error) throw new HttpError(error.code === '42501' ? 403 : 409, 'The file is unavailable or still published');
    return jsonResponse({ success: true, requested_at: data.requested_at, purge_after: data.purge_after }, 202);
  }
  const id = uuid(rawId);
  const table = kind === 'post' ? 'ap_objects' : kind === 'article' ? 'articles' : kind === 'comment' ? 'post_replies' : null;
  if (!table) throw new HttpError(400, 'Invalid content kind');
  const db = serviceClient();
  const { data: row, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!row) throw new HttpError(404, 'Content not found');
  let owner = row.user_id;
  if (kind === 'post') {
    const { data: actor, error } = await db.from('actors').select('id,user_id').eq('id', row.attributed_to).single();
    if (error) throw error;
    owner = actor.user_id || actor.id;
  }
  if (owner !== user.id) {
    const { data: roles, error: roleError } = await client.from('user_roles').select('role').eq('user_id', user.id);
    if (roleError) throw roleError;
    let allowed = roles?.some(role => ['admin', 'moderator'].includes(role.role));
    if (!allowed && row.company_id) {
      const { data: role, error } = await client.from('company_roles').select('role').eq('user_id', user.id).eq('company_id', row.company_id).maybeSingle();
      if (error) throw error;
      allowed = !!role && ['owner', 'admin', 'editor'].includes(role.role);
    }
    if (!allowed) throw new HttpError(403, 'You cannot delete this content');
  }
  const { data: existing, error: existingError } = await db.from('deletion_requests').select('requested_at,purge_after').eq('kind', kind).eq('subject_id', id).maybeSingle();
  if (existingError) throw existingError;
  if (existing) return jsonResponse({ success: true, ...existing });
  const encrypted = await encryptedDeletionSnapshot(String(kind), id, row);
  const { data: result, error: deletionError } = await db.rpc('schedule_content_deletion', {
    p_kind: kind, p_id: id, p_owner_id: owner, p_updated_at: row.updated_at,
    p_encrypted_payload: encrypted, p_files: contentMediaReferences(String(kind), row, Deno.env.get('SUPABASE_URL')!),
  });
  if (deletionError?.code === '40001') throw new HttpError(409, 'Content changed. Retry the deletion.');
  if (deletionError) throw deletionError;
  return jsonResponse({ success: true, requested_at: result.requested_at, purge_after: result.purge_after }, 202);
}));
