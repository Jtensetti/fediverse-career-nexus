import { serviceClient } from './local-actor.ts';
import { buildActorUrl, getFederationBaseUrl } from './federation-urls.ts';
import { CONTEXT, unwrap } from './local-content.ts';
import { remoteUrl } from './remote-fetch.ts';

type Backend = ReturnType<typeof serviceClient>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function localObjectId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const prefix = '/functions/v1/objects/';
    const id = parsed.pathname.slice(prefix.length);
    return parsed.origin === getFederationBaseUrl() && parsed.pathname.startsWith(prefix) &&
      !parsed.username && !parsed.password && !parsed.search && !parsed.hash && UUID.test(id) ? id : null;
  } catch { return null; }
}

export function objectAddress(row: { id: string; remote_object_id?: string | null }) {
  return row.remote_object_id ? remoteUrl(row.remote_object_id).href : `${getFederationBaseUrl()}/functions/v1/objects/${row.id}`;
}

/** The same transformation is used for delivery and dereferenceable objects. */
export async function resolveReplyAddress(db: Backend, row: any) {
  const body = unwrap(row.content);
  if (!body || typeof body.inReplyTo !== 'string' || !UUID.test(body.inReplyTo)) return row;
  const { data: parent, error } = await db.from('ap_objects').select('id,remote_object_id,attributed_to').eq('id', body.inReplyTo).maybeSingle();
  if (error) throw error;
  // A deleted parent keeps its canonical local tombstone address.
  const updated = { ...body, inReplyTo: objectAddress(parent || { id: body.inReplyTo }) };
  delete updated.rootPost;
  if (parent?.attributed_to) {
    const { data: actor, error } = await db.from('actors').select('is_remote,remote_actor_url,preferred_username').eq('id', parent.attributed_to).single();
    if (error) throw error;
    const address = actor.is_remote ? remoteUrl(actor.remote_actor_url).href : buildActorUrl(actor.preferred_username);
    updated.cc = [...new Set([...[body.cc].flat().filter((v: unknown) => typeof v === 'string'), address])];
  }
  return { ...row, content: row.content?.type === 'Create' ? { ...row.content, object: updated } : updated };
}

export function reactionActivity(actorUsername: string, snapshot: {
  reaction_id: string; target_id: string; remote_object_id?: string | null;
  target_remote: boolean; target_actor_url?: string | null; target_username: string;
}, undo = false) {
  const actor = buildActorUrl(actorUsername);
  const recipient = snapshot.target_remote ? remoteUrl(snapshot.target_actor_url || '').href : buildActorUrl(snapshot.target_username);
  const like = { '@context': CONTEXT, type: 'Like', id: `${actor}#like-${snapshot.reaction_id}`, actor,
    object: objectAddress({ id: snapshot.target_id, remote_object_id: snapshot.remote_object_id }), to: [recipient], cc: [] };
  return undo ? { '@context': CONTEXT, type: 'Undo', id: `${actor}#undo-like-${snapshot.reaction_id}`, actor, object: like, to: [recipient], cc: [] } : like;
}

export async function resolveKnownObject(db: Backend, address: string) {
  const id = localObjectId(address);
  const query = db.from('ap_objects').select('id,content,attributed_to,moderation_status,deleted_at');
  const { data, error } = await (id ? query.eq('id', id) : query.eq('remote_object_id', remoteUrl(address).href)).maybeSingle();
  if (error) throw error;
  return data;
}

export async function linkRemoteReply(db: Backend, replyId: string, address: unknown) {
  if (typeof address !== 'string') return;
  const parent = await resolveKnownObject(db, address);
  if (!parent || parent.deleted_at || parent.moderation_status !== 'published') return;
  const { data: link, error } = await db.from('federation_reply_links').select('root_id').eq('reply_id', parent.id).maybeSingle();
  if (error) throw error;
  const root = unwrap(parent.content)?.rootPost;
  const rootId = link?.root_id || (typeof root === 'string' && UUID.test(root) ? root : parent.id);
  const { error: saved } = await db.from('federation_reply_links').upsert({ reply_id: replyId, parent_id: parent.id, root_id: rootId }, { onConflict: 'reply_id', ignoreDuplicates: true });
  if (saved) throw saved;
}
