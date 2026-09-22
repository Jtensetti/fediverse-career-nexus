import { serviceClient } from '../_shared/local-actor.ts';
import { functionPath, getFederationBaseUrl } from '../_shared/federation-urls.ts';
import { randomToken, tokenHash } from '../_shared/oauth.ts';
import { HttpError } from '../_shared/user-auth.ts';
import { access, decimalId, instanceInfo, mastodonHandler, parameters, publicClient, rateLimit, redirectUri, requestIp, response, rpc, safeUrl, scopes, type Grant } from '../_shared/mastodon.ts';
import { accounts, noteBody, relationships, statuses, type AccountRow, type StatusRow } from '../_shared/mastodon-entities.ts';

async function oneAccount(id: string) {
  const { data,error } = await publicClient().from('mastodon_accounts').select('*').eq('id',decimalId(id)).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404,'Account not found');
  return data as AccountRow;
}
async function oneStatus(id: string) {
  const { data,error } = await publicClient().from('mastodon_statuses').select('*').eq('id',decimalId(id)).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError(404,'Status not found');
  return data as StatusRow;
}
function page(url: URL) {
  const rawLimit = url.searchParams.get('limit') || '20';
  if (!/^\d{1,3}$/.test(rawLimit)) throw new HttpError(400,'Invalid limit');
  if (url.searchParams.has('min_id')) throw new HttpError(422,'Use since_id for newer statuses');
  return { limit: Math.max(1,Math.min(40,Number(rawLimit))), max: url.searchParams.has('max_id') ? decimalId(url.searchParams.get('max_id')) : null, since: url.searchParams.has('since_id') ? decimalId(url.searchParams.get('since_id')) : null };
}
function pagination(url: URL,path: string,rows: StatusRow[]): Record<string,string> {
  if (!rows.length) return {};
  const next = new URL(path,getFederationBaseUrl()); next.search=url.search;
  next.searchParams.set('max_id',rows.at(-1)!.id); next.searchParams.delete('since_id');
  const prev = new URL(path,getFederationBaseUrl()); prev.search=url.search;
  prev.searchParams.set('since_id',rows[0].id); prev.searchParams.delete('max_id');
  return { Link: '<'+next+'>; rel="next", <'+prev+'>; rel="prev"' };
}
export const handleMastodonRequest = mastodonHandler(async req => {
  const db = serviceClient(10000);
  const publicDb = publicClient();
  const url = new URL(req.url);
  const path = '/'+(functionPath(url,'mastodon-api') || []).join('/');
  if (req.method === 'GET' && ['/api/v1/instance','/api/v2/instance'].includes(path)) {
    const stats = await rpc<Record<string,number>>(publicDb,'mastodon_instance_stats');
    return response(instanceInfo(path.includes('/v2/'),stats));
  }
  if (path === '/api/v1/apps' && req.method === 'POST') {
    await rateLimit(db,'app-registration:global',100);
    await rateLimit(db,'app-registration:'+requestIp(req),10);
    const input = await parameters(req);
    if (typeof input.client_name !== 'string' || !input.client_name.trim() || input.client_name.length > 100) throw new HttpError(400,'Provide an app name of at most 100 characters');
    const raw = Array.isArray(input.redirect_uris) ? input.redirect_uris : typeof input.redirect_uris === 'string' ? input.redirect_uris.split(/\s+/) : [];
    if (!raw.length || raw.length > 10) throw new HttpError(400,'Provide 1 to 10 redirect URIs');
    const uris = [...new Set(raw.map(redirectUri))];
    const requested = scopes(input.scopes);
    const website = input.website ? safeUrl(input.website) : null;
    if (input.website && !website) throw new HttpError(400,'App website must use HTTPS');
    const secret = randomToken();
    const { data,error } = await db.from('mastodon_clients').insert({ name: input.client_name.trim(), website, redirect_uris: uris, scopes: requested, secret_hash: await tokenHash(secret) }).select('id,name,website,redirect_uris,scopes').single();
    if (error) throw error;
    return response({ ...data, client_id: data.id, client_secret: secret, client_secret_expires_at: 0, redirect_uri: uris.join('\n') });
  }
  if (path === '/api/v1/apps/verify_credentials' && req.method === 'GET') {
    const { grant } = await access(req,db);
    const { data,error } = await db.from('mastodon_clients').select('id,name,website,redirect_uris,scopes').eq('id',grant.client_id).single();
    if (error) throw error;
    return response(data);
  }
  if (path === '/api/v1/accounts/verify_credentials' && req.method === 'GET') {
    const { grant } = await access(req,db,'read:accounts',true);
    const { data,error } = await publicDb.from('mastodon_accounts').select('*').eq('actor_id',grant.actor_id).single();
    if (error) throw error;
    return response((await accounts([data as AccountRow],grant.actor_id))[0]);
  }
  if (path === '/api/v1/accounts/relationships' && req.method === 'GET') {
    const { grant } = await access(req,db,'read:follows',true);
    const ids = [...new Set([...url.searchParams.getAll('id[]'),...url.searchParams.getAll('id')])].slice(0,80).map(decimalId);
    if (!ids.length) return response([]);
    const { data,error } = await publicDb.from('mastodon_accounts').select('*').in('id',ids);
    if (error) throw error;
    return response(await relationships(data as AccountRow[],db,grant));
  }
  if (path === '/api/v1/favourites' && req.method === 'GET') {
    const { grant,hash } = await access(req,db,'read:favourites',true);
    const { limit,max,since } = page(url);
    const rows = await rpc<StatusRow[]>(db,'mastodon_favourites',{ p_hash:hash,p_max:max,p_since:since,p_limit:limit });
    return response(await statuses(rows,db,grant),200,pagination(url,path,rows));
  }
  let grant: Grant | undefined;
  let readHash: string | undefined;
  // Invalid supplied credentials never silently become anonymous access.
  if (req.headers.has('authorization') && req.method === 'GET') ({ grant, hash:readHash } = await access(req,db,(path.includes('/accounts') && !path.endsWith('/statuses')) || path.includes('/search') ? 'read:accounts' : 'read:statuses'));
  if (path === '/api/v1/accounts/lookup' && req.method === 'GET') {
    const acct = (url.searchParams.get('acct') || '').replace(/^@/,'');
    if (!/^[A-Za-z0-9_.-]{1,64}(@[A-Za-z0-9.-]+)?$/.test(acct)) throw new HttpError(400,'Invalid account address');
    const [username,host] = acct.split('@');
    const { data,error } = await publicDb.from('mastodon_accounts').select('*').eq('preferred_username',username).limit(100);
    if (error) throw error;
    const row = (data as AccountRow[]).find(row => host && host !== new URL(getFederationBaseUrl()).hostname ? row.is_remote && safeUrl(row.remote_actor_url) && new URL(row.remote_actor_url!).hostname === host : !row.is_remote);
    if (!row) throw new HttpError(404,'Account not found. Discover remote accounts in Nolto first.');
    return response((await accounts([row]))[0]);
  }
  const accountMatch = path.match(/^\/api\/v1\/accounts\/([0-9]+)(?:\/(statuses|follow|unfollow))?$/);
  if (accountMatch) {
    const row = await oneAccount(accountMatch[1]);
    const operation = accountMatch[2];
    if (!operation && req.method === 'GET') return response((await accounts([row]))[0]);
    if (['follow','unfollow'].includes(operation) && req.method === 'POST') {
      const { grant,hash } = await access(req,db,'write:follows',true);
      if (Number(req.headers.get('content-length') || 0) > 0 || req.headers.has('content-type')) {
        const input = await parameters(req);
        if (input.notify === true || input.notify === 'true' || input.reblogs === false || input.reblogs === 'false' || input.languages !== undefined) throw new HttpError(422,'Follow notifications, languages and boost preferences are not supported');
      }
      await rpc(db,'mastodon_write',{ p_hash: hash, p_operation: operation, p_payload: { id: row.id }, p_base: getFederationBaseUrl() });
      return response((await relationships([row],db,grant))[0]);
    }
    if (operation === 'statuses' && req.method === 'GET') {
      const { limit,max,since } = page(url);
      if (url.searchParams.get('pinned') === 'true' || url.searchParams.get('pinned') === '1') throw new HttpError(501,'Pinned statuses are not supported');
      let query = publicDb.from('mastodon_statuses').select('*').eq('attributed_to',row.actor_id).order('sort_id',{ ascending:false }).limit(limit);
      if (max) query=query.lt('sort_id',max); if (since) query=query.gt('sort_id',since);
      const { data,error } = await query; if (error) throw error;
      let rows = data as StatusRow[];
      if (['true','1'].includes(url.searchParams.get('exclude_replies') || '')) rows=rows.filter(row => !noteBody(row).inReplyTo);
      if (['true','1'].includes(url.searchParams.get('only_media') || '')) rows=rows.filter(row => Array.isArray(noteBody(row).attachment) && (noteBody(row).attachment as unknown[]).length);
      return response(await statuses(rows,db,grant),200,pagination(url,path,data as StatusRow[]));
    }
  }
  if (['/api/v1/timelines/home','/api/v1/timelines/public'].includes(path) && req.method === 'GET') {
    const { limit,max,since } = page(url);
    let rows: StatusRow[];
    if (path.endsWith('/home')) {
      if (!grant?.user_id || !readHash) throw new HttpError(401,'User authorization required');
      rows = await rpc(db,'mastodon_home',{ p_hash:readHash,p_max:max,p_since:since,p_limit:limit });
    } else {
      let query = publicDb.from('mastodon_statuses').select('*').order('sort_id',{ ascending:false }).limit(limit);
      if (max) query=query.lt('sort_id',max); if (since) query=query.gt('sort_id',since);
      if (['true','1'].includes(url.searchParams.get('local') || '')) query=query.is('remote_object_id',null);
      if (['true','1'].includes(url.searchParams.get('remote') || '')) query=query.not('remote_object_id','is',null);
      const { data,error } = await query; if (error) throw error; rows=data as StatusRow[];
    }
    return response(await statuses(rows,db,grant),200,pagination(url,path,rows));
  }
  if (path === '/api/v2/search' && req.method === 'GET') {
    if (url.searchParams.get('resolve') === 'true') throw new HttpError(501,'Remote discovery is available through Nolto search');
    const search = (url.searchParams.get('q') || '').replace(/^@/,'').slice(0,64);
    if (!/^[A-Za-z0-9_.-]+$/.test(search)) return response({ accounts: [], statuses: [], hashtags: [] });
    if (url.searchParams.has('type') && url.searchParams.get('type') !== 'accounts') throw new HttpError(501,'Only account search is supported');
    const { data,error } = await publicDb.from('mastodon_accounts').select('*').ilike('preferred_username',search.replace(/[_%]/g,'\\$&')+'%').limit(20);
    if (error) throw error;
    return response({ accounts: await accounts(data as AccountRow[]), statuses: [], hashtags: [] });
  }
  if (path === '/api/v1/statuses' && req.method === 'POST') {
    const { grant,hash } = await access(req,db,'write:statuses',true);
    const input = await parameters(req);
    if (input.visibility !== undefined && input.visibility !== 'public') throw new HttpError(422,'Only public statuses are supported. Nothing was published.');
    if (Object.keys(input).some(key => !['status','visibility','in_reply_to_id','sensitive','spoiler_text','language','media_ids'].includes(key)) || (input.media_ids !== undefined && (!Array.isArray(input.media_ids) || input.media_ids.length))) throw new HttpError(422,'Media uploads, polls, quotes and scheduled posts are not supported');
    if (typeof input.status !== 'string' || (input.spoiler_text !== undefined && typeof input.spoiler_text !== 'string')) throw new HttpError(422,'Provide status text');
    if (input.sensitive !== undefined && ![true,false,'true','false'].includes(input.sensitive as boolean | string)) throw new HttpError(422,'Invalid sensitive flag');
    if (input.language !== undefined && input.language !== null && (typeof input.language !== 'string' || !/^[a-z]{2,3}(-[A-Za-z]{2,8})?$/.test(input.language))) throw new HttpError(422,'Invalid language');
    const payload = { status: input.status, spoiler_text: input.spoiler_text || '', sensitive: input.sensitive === true || input.sensitive === 'true', language: input.language || null, id: input.in_reply_to_id ? decimalId(input.in_reply_to_id) : null };
    const key = req.headers.get('idempotency-key');
    if (key && key.length > 128) throw new HttpError(400,'Idempotency key is too long');
    const result = await rpc<{ object_id:string; status_id:string }>(db,'mastodon_write',{ p_hash:hash,p_operation:'status',p_payload:{ ...payload, ...(key ? { key_hash:await tokenHash(key),body_hash:await tokenHash(JSON.stringify(payload)) } : {}) },p_base:getFederationBaseUrl() });
    // A newly submitted post awaiting review is returned only to its author.
    const { data: own,error } = await db.from('ap_objects').select('id,attributed_to,content,type,content_warning,created_at,updated_at,published_at,remote_object_id,moderation_status').eq('id',result.object_id).eq('attributed_to',grant.actor_id).is('deleted_at',null).single();
    if (error) throw error;
    const { data: account,error: accountError } = await publicDb.from('mastodon_accounts').select('id').eq('actor_id',grant.actor_id).single();
    if (accountError) throw accountError;
    const row = { ...own, id:decimalId(result.status_id),object_id:own.id,account_id:account.id } as StatusRow;
    return response((await statuses([row],db,grant))[0],own.moderation_status === 'published' ? 200 : 202);
  }
  const statusMatch = path.match(/^\/api\/v1\/statuses\/([0-9]+)(?:\/(context|favourite|unfavourite))?$/);
  if (statusMatch) {
    const row = await oneStatus(statusMatch[1]);
    const operation = statusMatch[2];
    if (req.method === 'GET' && !operation) return response((await statuses([row],db,grant))[0]);
    if (req.method === 'POST' && ['favourite','unfavourite'].includes(operation)) {
      const auth = await access(req,db,'write:favourites',true);
      await rpc(db,'mastodon_write',{ p_hash:auth.hash,p_operation:operation,p_payload:{id:row.id},p_base:getFederationBaseUrl() });
      return response((await statuses([row],db,auth.grant))[0]);
    }
    if (req.method === 'GET' && operation === 'context') {
      const ancestors: StatusRow[] = []; let cursor = row; const seen=new Set([row.object_id]);
      for (let depth=0;depth<20;depth++) {
        const { data: link,error } = await publicDb.from('federation_reply_links').select('parent_id').eq('reply_id',cursor.object_id).maybeSingle();
        if (error) throw error;
        const parent = link?.parent_id || noteBody(cursor).inReplyTo;
        if (typeof parent !== 'string' || !/^[0-9a-f-]{36}$/i.test(parent) || seen.has(parent)) break;
        const { data,error: parentError } = await publicDb.from('mastodon_statuses').select('*').eq('object_id',parent).maybeSingle();
        if (parentError) throw parentError; if (!data) break;
        cursor=data as StatusRow; ancestors.unshift(cursor); seen.add(parent);
      }
      const root=ancestors[0] || row;
      const replies = await rpc<{id:string}[]>(publicDb,'get_post_replies',{post_id:root.object_id,max_replies:100});
      const ids=replies.map(item=>item.id).filter(id=>!seen.has(id));
      const { data,error } = ids.length ? await publicDb.from('mastodon_statuses').select('*').in('object_id',ids).order('sort_id',{ascending:true}) : { data:[],error:null };
      if (error) throw error;
      const candidates=data as StatusRow[];
      const { data: links,error: linksError } = candidates.length ? await publicDb.from('federation_reply_links').select('reply_id,parent_id').in('reply_id',candidates.map(item=>item.object_id)) : {data:[],error:null};
      if (linksError) throw linksError;
      const parents=new Map((links||[]).map(link=>[link.reply_id,link.parent_id]));
      const descendants=new Set([row.object_id]);
      for (let pass=0;pass<candidates.length;pass++) {
        let added=false;
        for (const item of candidates) {
          const parent=parents.get(item.object_id) || noteBody(item).inReplyTo;
          if (!descendants.has(item.object_id) && typeof parent==='string' && descendants.has(parent)) { descendants.add(item.object_id); added=true; }
        }
        if (!added) break;
      }
      return response({ ancestors:await statuses(ancestors,db,grant),descendants:await statuses(candidates.filter(item=>descendants.has(item.object_id)),db,grant) });
    }
  }
  if (path === '/api/v1/custom_emojis' && req.method === 'GET') return response([]);
  throw new HttpError(501,'This Mastodon API operation is not supported by Nolto yet');
});
