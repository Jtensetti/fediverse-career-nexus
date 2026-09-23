import { serviceClient } from '../_shared/local-actor.ts';
import { functionPath, getFederationBaseUrl, getSiteUrl } from '../_shared/federation-urls.ts';
import { randomToken, tokenHash, pkceChallenge } from '../_shared/oauth.ts';
import { HttpError, requireUser, uuid } from '../_shared/user-auth.ts';
import { browserOrigin, hasScope, MASTODON_SCOPES, mastodonAccessPolicy, mastodonHandler, parameters, rateLimit, requestIp, requireMastodonUser, response, rpc, scopes } from '../_shared/mastodon.ts';

const db = () => serviceClient(10000);
async function authorizationRequest(input: Record<string, unknown>) {
  if (input.response_type !== 'code') throw new HttpError(400, 'Only authorization code requests are supported');
  const clientId = uuid(input.client_id, 'client_id');
  const { data: client, error } = await db().from('mastodon_clients').select('id,name,website,redirect_uris,scopes').eq('id',clientId).maybeSingle();
  if (error) throw error;
  if (!client || typeof input.redirect_uri !== 'string' || !client.redirect_uris.includes(input.redirect_uri)) throw new HttpError(400, 'Unregistered redirect URI');
  const requested = scopes(input.scope);
  if (requested.some(scope => !hasScope(client.scopes,scope))) throw new HttpError(400, 'Scope was not registered for this app');
  if (input.state !== undefined && (typeof input.state !== 'string' || input.state.length > 2048)) throw new HttpError(400, 'Invalid state');
  const challenge = input.code_challenge;
  if (challenge !== undefined && (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge) || input.code_challenge_method !== 'S256')) throw new HttpError(400, 'PKCE must use S256');
  if (challenge === undefined && input.code_challenge_method !== undefined) throw new HttpError(400, 'Missing PKCE challenge');
  return { client, requested, redirect: input.redirect_uri, state: input.state as string | undefined, challenge: challenge as string | undefined };
}
export const handleOAuthRequest = mastodonHandler(async req => {
  const url = new URL(req.url);
  const path = functionPath(url,'oauth-authorization-server')?.join('/') ?? '';
  if (!path && req.method === 'GET') {
    const origin = getFederationBaseUrl();
    return response({ issuer: origin, authorization_endpoint: getSiteUrl()+'/oauth/authorize', token_endpoint: origin+'/oauth/token', revocation_endpoint: origin+'/oauth/revoke', registration_endpoint: origin+'/api/v1/apps',
      scopes_supported: MASTODON_SCOPES, response_types_supported: ['code'], grant_types_supported: mastodonAccessPolicy().mode === 'pilot' ? ['authorization_code'] : ['authorization_code','client_credentials'], token_endpoint_auth_methods_supported: ['client_secret_post','client_secret_basic'], code_challenge_methods_supported: ['S256'], service_documentation: getSiteUrl()+'/mastodon-apps' });
  }
  if (path === 'request' && req.method === 'GET') {
    const request = await authorizationRequest(Object.fromEntries(url.searchParams));
    return response({ client: { name: request.client.name, website: request.client.website }, scopes: request.requested, redirect_uri: request.redirect, pkce: !!request.challenge });
  }
  if (path === 'consent' && req.method === 'POST') {
    browserOrigin(req);
    const input = await parameters(req);
    const request = await authorizationRequest(input);
    const redirect = new URL(request.redirect);
    if (request.state !== undefined) redirect.searchParams.set('state',request.state);
    if (input.decision === 'deny') { redirect.searchParams.set('error','access_denied'); return response({ redirect: redirect.href }); }
    if (input.decision !== 'allow') throw new HttpError(400, 'Choose allow or deny');
    const { user, token } = await requireUser(req);
    requireMastodonUser(user.id);
    await rateLimit(db(),'consent:'+user.id,20);
    // requireUser verified this exact JWT with Auth and the session/MFA RPCs.
    const segment = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
    const claims = JSON.parse(atob(segment.padEnd(Math.ceil(segment.length/4)*4,'=')));
    const sessionId = uuid(claims.session_id,'session');
    if (!['aal1','aal2'].includes(claims.aal)) throw new HttpError(401,'Invalid assurance level');
    const code = randomToken();
    await rpc(db(),'mastodon_issue_code',{ p_client: request.client.id, p_user: user.id, p_session: sessionId, p_aal: claims.aal, p_redirect: request.redirect, p_scopes: request.requested, p_hash: await tokenHash(code), p_challenge: request.challenge || null });
    redirect.searchParams.set('code',code);
    return response({ redirect: redirect.href });
  }
  if (path === 'grants' && ['GET','DELETE'].includes(req.method)) {
    browserOrigin(req);
    const { user } = await requireUser(req);
    if (req.method === 'DELETE') {
      const input = await parameters(req);
      const clientId = uuid(input.client_id,'client_id');
      await rpc(db(),'mastodon_revoke_app',{ p_user: user.id, p_client: clientId });
      return response({ revoked: true });
    }
    const { data, error } = await db().from('mastodon_grants').select('id,client_id,scopes,created_at,expires_at,mastodon_clients(name,website)').eq('user_id',user.id).is('revoked_at',null).gt('expires_at',new Date().toISOString()).order('created_at',{ ascending:false }).limit(100);
    if (error) throw error;
    return response({ grants: data });
  }
  if (['token','revoke'].includes(path) && req.method === 'POST') {
    const input = await parameters(req);
    const basic = req.headers.get('authorization')?.match(/^Basic (.+)$/i)?.[1];
    if (basic) {
      if (input.client_id !== undefined || input.client_secret !== undefined) throw new HttpError(400,'Use one client authentication method');
      try { const credentials = atob(basic); const colon = credentials.indexOf(':'); if (colon < 0) throw new Error(); input.client_id = decodeURIComponent(credentials.slice(0,colon)); input.client_secret = decodeURIComponent(credentials.slice(colon+1)); } catch { throw new HttpError(401,'Invalid client credentials'); }
    }
    await rateLimit(db(),'token-ip:'+requestIp(req),60);
    const clientId = uuid(input.client_id,'client_id');
    if (typeof input.client_secret !== 'string' || !/^[0-9a-f]{64}$/.test(input.client_secret)) throw new HttpError(401,'Invalid client credentials');
    const secretHash = await tokenHash(input.client_secret);
    const { data: client, error } = await db().from('mastodon_clients').select('id,scopes').eq('id',clientId).eq('secret_hash',secretHash).maybeSingle();
    if (error) throw error;
    if (!client) throw new HttpError(401,'Invalid client credentials');
    await rateLimit(db(),'token-client:'+clientId,60);
    if (path === 'revoke') {
      if (typeof input.token !== 'string' || input.token.length > 256) throw new HttpError(400,'Invalid token');
      const { error } = await db().from('mastodon_grants').update({ revoked_at: new Date().toISOString() }).eq('client_id',clientId).eq('token_hash',await tokenHash(input.token));
      if (error) throw error;
      return response({});
    }
    const accessToken = randomToken();
    let issued: { scopes: string[]; created_at: number; expires_in: number };
    if (input.grant_type === 'authorization_code') {
      if (typeof input.code !== 'string' || !/^[0-9a-f]{64}$/.test(input.code) || typeof input.redirect_uri !== 'string') throw new HttpError(400,'Invalid authorization code request');
      if (input.code_verifier !== undefined && (typeof input.code_verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.code_verifier))) throw new HttpError(400,'Invalid PKCE verifier');
      const codeHash = await tokenHash(input.code);
      if (mastodonAccessPolicy().mode === 'pilot') {
        const { data: code, error } = await db().from('mastodon_codes').select('user_id').eq('code_hash',codeHash).eq('client_id',clientId).maybeSingle();
        if (error) throw error;
        if (!code) throw new HttpError(401,'Invalid authorization code');
        requireMastodonUser(code.user_id);
      }
      // The atomic exchange still validates session, MFA, expiry, replay and PKCE.
      issued = await rpc(db(),'mastodon_exchange_code',{ p_client: clientId, p_secret: secretHash, p_code: codeHash, p_redirect: input.redirect_uri, p_challenge: input.code_verifier ? await pkceChallenge(input.code_verifier as string) : null, p_token: await tokenHash(accessToken) });
    } else if (input.grant_type === 'client_credentials') {
      requireMastodonUser(null);
      const requested = scopes(input.scope);
      if (requested.some(scope => !hasScope(client.scopes,scope))) throw new HttpError(400,'Invalid scope');
      const { data, error } = await db().from('mastodon_grants').insert({ token_hash: await tokenHash(accessToken), client_id: clientId, scopes: requested }).select('created_at').single();
      if (error) throw error;
      issued = { scopes: requested, created_at: Math.floor(Date.parse(data.created_at)/1000), expires_in: 2592000 };
    } else throw new HttpError(400,'Unsupported grant type');
    return response({ access_token: accessToken, token_type: 'Bearer', scope: issued.scopes.join(' '), created_at: issued.created_at, expires_in: issued.expires_in });
  }
  throw new HttpError(404,'Unknown OAuth endpoint');
}, req => {
  const path = functionPath(new URL(req.url),'oauth-authorization-server')?.join('/') ?? '';
  return (path === 'revoke' && req.method === 'POST') || (path === 'grants' && ['GET','DELETE'].includes(req.method));
});
