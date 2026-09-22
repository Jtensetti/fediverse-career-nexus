import { buildProfilePageUrl, getFederationBaseUrl } from './federation-urls.ts';
import { publicClient, rpc, safeHtml, safeUrl, type Db, type Grant } from './mastodon.ts';

export type AccountRow = { id: string; actor_id: string; user_id: string | null; preferred_username: string; is_remote: boolean; remote_actor_url: string | null; created_at: string; follower_count: number; following_count: number; fullname: string | null; bio: string | null; avatar_url: string | null; header_url: string | null };
export type StatusRow = { id: string; object_id: string; account_id: string; attributed_to: string; content: Record<string, unknown>; type: string; content_warning: string | null; created_at: string; updated_at: string; published_at: string; remote_object_id: string | null; moderation_status?: string };
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const noteBody = (row: StatusRow): Record<string,unknown> => row.type === 'Create' && row.content?.object && typeof row.content.object === 'object' ? row.content.object as Record<string,unknown> : row.content || {};

export function accountEntity(row: AccountRow, count = 0, own = false) {
  const remote = safeUrl(row.remote_actor_url);
  const username = row.preferred_username.split('@')[0];
  const url = row.is_remote && remote ? remote : buildProfilePageUrl(username);
  const placeholder = getFederationBaseUrl()+'/placeholder.svg';
  const avatar = safeUrl(row.avatar_url) || placeholder;
  const header = safeUrl(row.header_url) || placeholder;
  return { id: row.id, username, acct: row.is_remote && remote ? username+'@'+new URL(remote).hostname : username, url,
    display_name: row.fullname || username, note: safeHtml(row.bio), avatar, avatar_static: avatar, header, header_static: header,
    locked: false, bot: false, discoverable: true, group: false, created_at: row.created_at, last_status_at: null,
    followers_count: row.follower_count || 0, following_count: row.following_count || 0, statuses_count: count, emojis: [], fields: [],
    ...(own ? { source: { privacy: 'public', sensitive: false, language: 'sv', note: row.bio || '', fields: [], follow_requests_count: 0 } } : {}) };
}
export async function accounts(rows: AccountRow[], ownActor?: string | null) {
  if (!rows.length) return [];
  const counts = await rpc<{ actor_id: string; statuses_count: number }[]>(publicClient(), 'mastodon_account_counts', { p_ids: rows.map(row => row.actor_id) });
  const byActor = new Map(counts.map(row => [row.actor_id,Number(row.statuses_count)]));
  return rows.map(row => accountEntity(row,byActor.get(row.actor_id) || 0,row.actor_id === ownActor));
}
export async function statuses(rows: StatusRow[], db: Db, grant?: Grant) {
  if (!rows.length) return [];
  const publicDb = publicClient();
  const ids = rows.map(row => row.object_id);
  const [{ data: actorRows, error: actorError }, counts, { data: links, error: linkError }] = await Promise.all([
    publicDb.from('mastodon_accounts').select('*').in('id',[...new Set(rows.map(row => row.account_id))]),
    rpc<{ object_id: string; favourites_count: number; replies_count: number }[]>(publicDb,'mastodon_status_counts',{ p_ids: ids }),
    publicDb.from('federation_reply_links').select('reply_id,parent_id').in('reply_id',ids),
  ]);
  if (actorError) throw actorError;
  if (linkError) throw linkError;
  const renderedAccounts = await accounts(actorRows as AccountRow[]);
  const actorMap = new Map(renderedAccounts.map(row => [row.id,row]));
  const countMap = new Map(counts.map(row => [row.object_id,row]));
  const parentMap = new Map<string,string>((links || []).map(row => [row.reply_id,row.parent_id]));
  for (const row of rows) {
    const parent = noteBody(row).inReplyTo;
    if (!parentMap.has(row.object_id) && typeof parent === 'string' && uuidPattern.test(parent)) parentMap.set(row.object_id,parent);
  }
  const { data: parents, error: parentError } = parentMap.size
    ? await publicDb.from('mastodon_statuses').select('id,object_id,account_id').in('object_id',[...parentMap.values()])
    : { data: [], error: null };
  if (parentError) throw parentError;
  const parentsByObject = new Map((parents || []).map(row => [row.object_id,row]));
  const ownFavourites = new Set<string>();
  if (grant?.user_id) {
    const { data, error } = await db.from('reactions').select('target_id').eq('user_id',grant.user_id).in('target_id',ids).in('target_type',['post','reply']);
    if (error) throw error;
    for (const item of data || []) ownFavourites.add(item.target_id);
  }
  return rows.flatMap(row => {
    const account = actorMap.get(row.account_id);
    if (!account) return [];
    const body = noteBody(row);
    const parent = parentsByObject.get(parentMap.get(row.object_id) || '');
    const counts = countMap.get(row.object_id);
    const remote = !!row.remote_object_id;
    const canonical = getFederationBaseUrl()+'/functions/v1/objects/'+row.object_id;
    const attachments = Array.isArray(body.attachment) ? body.attachment : [];
    const media = attachments.slice(0,4).flatMap((attachment,index) => {
      if (!attachment || typeof attachment !== 'object') return [];
      const item = attachment as Record<string,unknown>;
      const url = safeUrl(item.url);
      if (!url || (item.type !== 'Image' && !String(item.mediaType || '').startsWith('image/'))) return [];
      return [{ id: row.id+String(index+1), type: 'image', url, preview_url: url, remote_url: remote ? url : null, description: typeof item.name === 'string' ? item.name.slice(0,1500) : null, blurhash: null, meta: {} }];
    });
    return [{ id: row.id, uri: safeUrl(row.remote_object_id) || canonical, url: safeUrl(body.url) || (remote ? safeUrl(row.remote_object_id) : getFederationBaseUrl()+'/post/'+row.object_id),
      created_at: row.published_at || row.created_at, edited_at: row.updated_at !== row.created_at ? row.updated_at : null, account,
      content: safeHtml(body.content,remote), visibility: 'public', sensitive: body.sensitive === true || !!row.content_warning, spoiler_text: row.content_warning || (typeof body.summary === 'string' ? body.summary : ''),
      in_reply_to_id: parent?.id || null, in_reply_to_account_id: parent?.account_id || null, media_attachments: media,
      mentions: [], tags: [], emojis: [], reblogs_count: 0, favourites_count: Number(counts?.favourites_count || 0), replies_count: Number(counts?.replies_count || 0),
      reblog: null, poll: null, card: null, language: typeof body.language === 'string' ? body.language : null,
      text: typeof body.content === 'string' ? body.content : '', favourited: ownFavourites.has(row.object_id), reblogged: false, muted: false, bookmarked: false,
      application: null, ...(row.moderation_status && row.moderation_status !== 'published' ? { nolto_moderation_status: row.moderation_status } : {}) }];
  });
}
export async function relationships(rows: AccountRow[], db: Db, grant: Grant) {
  const ownUser = grant.user_id!;
  const localUsers = rows.flatMap(row => row.user_id ? [row.user_id] : []);
  const remoteUrls = rows.flatMap(row => row.remote_actor_url ? [row.remote_actor_url] : []);
  const local = localUsers.length ? await db.from('author_follows').select('author_id,follower_id').or('follower_id.eq.'+ownUser+',author_id.eq.'+ownUser).in('author_id',[ownUser,...localUsers]).in('follower_id',[ownUser,...localUsers]) : { data: [], error: null };
  const remote = remoteUrls.length ? await db.from('outgoing_follows').select('remote_actor_url,status').eq('local_actor_id',grant.actor_id).in('remote_actor_url',remoteUrls) : { data: [], error: null };
  const incoming = remoteUrls.length ? await db.from('actor_followers').select('follower_actor_url,status').eq('local_actor_id',grant.actor_id).in('follower_actor_url',remoteUrls) : { data: [], error: null };
  const blocked = localUsers.length ? await db.from('user_blocks').select('blocked_user_id,blocker_id').or('blocker_id.eq.'+ownUser+',blocked_user_id.eq.'+ownUser).in('blocker_id',[ownUser,...localUsers]).in('blocked_user_id',[ownUser,...localUsers]) : { data: [], error: null };
  for (const result of [local,remote,incoming,blocked]) if (result.error) throw result.error;
  return rows.map(row => ({ id: row.id, following: row.is_remote ? !!remote.data?.some(f => f.remote_actor_url === row.remote_actor_url && f.status === 'accepted') : !!local.data?.some(f => f.follower_id === ownUser && f.author_id === row.user_id),
    showing_reblogs: true, notifying: false, languages: [], followed_by: row.is_remote ? !!incoming.data?.some(f => f.follower_actor_url === row.remote_actor_url && f.status === 'accepted') : !!local.data?.some(f => f.author_id === ownUser && f.follower_id === row.user_id),
    blocking: !!blocked.data?.some(b => b.blocker_id === ownUser && b.blocked_user_id === row.user_id), blocked_by: !!blocked.data?.some(b => b.blocked_user_id === ownUser && b.blocker_id === row.user_id),
    muting: false, muting_notifications: false, requested: !!remote.data?.some(f => f.remote_actor_url === row.remote_actor_url && f.status === 'pending'), requested_by: false, domain_blocking: false, endorsed: false, note: '' }));
}
