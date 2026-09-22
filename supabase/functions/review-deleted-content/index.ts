import { serviceClient, jsonResponse } from '../_shared/local-actor.ts';
import { postHandler, requireUser, requestBody, uuid, HttpError } from '../_shared/user-auth.ts';
import { retentionSecret } from '../_shared/deletion.ts';
import { decryptValue } from '../_shared/encryption.ts';

Deno.serve(postHandler(async req => {
  const { user, client } = await requireUser(req);
  const { data: moderator, error: roleError } = await client.rpc('is_moderator', { _user_id: user.id });
  if (roleError) throw roleError;
  if (moderator !== true) throw new HttpError(403, 'Moderator access required');
  const { report_id } = await requestBody(req, 1024);
  const { data, error } = await serviceClient(10000).rpc('read_reported_deleted_content', {
    p_report_id: uuid(report_id, 'report_id'), p_moderator_id: user.id,
  });
  if (error) throw error;
  const archive = data?.[0];
  if (!archive) throw new HttpError(404, 'No retained text is available for this open report');
  const snapshot = JSON.parse(await decryptValue(archive.encrypted_payload, retentionSecret(), 'retention'));
  if (snapshot.schema !== 'nolto-retention/1' || snapshot.kind !== archive.kind || snapshot.id !== archive.subject_id) {
    throw new Error('Archive identity mismatch');
  }
  if (Date.parse(archive.purge_after) <= Date.now()) throw new HttpError(404, 'Retention has expired');
  // Project only published text. Never return a full account snapshot, credentials or private messages.
  const row = snapshot.row;
  const object = row?.content?.type === 'Create' ? row.content.object : row?.content;
  const title = archive.kind === 'article' ? row?.title : object?.name;
  const content = archive.kind === 'article' ? row?.content : object?.content;
  return jsonResponse({ title: typeof title === 'string' ? title : '',
    content: typeof content === 'string' ? content : '', purge_after: archive.purge_after });
}));
