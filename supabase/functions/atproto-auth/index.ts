import { serviceClient, jsonResponse, federationHeaders } from '../_shared/local-actor.ts';
import { getSiteUrl } from '../_shared/federation-urls.ts';
import { HttpError, requireUser, requestBody } from '../_shared/user-auth.ts';
import { randomToken } from '../_shared/oauth.ts';
import { atprotoHandle, atprotoMetadata, atprotoCallbackParams, browserProof, ATPROTO_SCOPE } from '../_shared/atproto-policy.ts';
import { createAtprotoClient, atprotoLock } from '../_shared/atproto-client.ts';

const headers = { ...federationHeaders, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const respond = (body: unknown, status = 200) => {
  const response = jsonResponse(body, status);
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers });
  let site: string;
  try { site = getSiteUrl(); }
  catch { return respond({ error: 'The canonical site origin is not configured correctly' }, 503); }
  const path = new URL(req.url).pathname;
  const enabled = Deno.env.get('ATPROTO_AUTH_ENABLED') === 'true';
  if (req.method === 'GET' && path.endsWith('/client-metadata.json')) {
    return respond(atprotoMetadata(site));
  }
  if (req.method === 'GET') {
    let ready = false;
    if (enabled && new TextEncoder().encode(Deno.env.get('TOKEN_ENCRYPTION_KEY') || '').length >= 32) {
      const { error } = await serviceClient().from('atproto_oauth_states').select('state_hash', { head: true }).limit(0);
      ready = !error;
    }
    return respond({ ready, siteUrl: site });
  }
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  if (!enabled) return respond({ error: 'Bluesky sign-in is not enabled yet' }, 503);
  if (req.headers.get('origin') !== site) return respond({ error: `Start sign-in at ${site}` }, 403);
  try {
    const body = await requestBody(req, 10000);
    const proof = browserProof(body.browserProof);
    const db = serviceClient();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { count, error: rateError } = await db.from('auth_request_logs').select('id', { count: 'exact', head: true })
      .eq('ip', ip).eq('endpoint', 'atproto-auth').gte('timestamp', new Date(Date.now() - 60000).toISOString());
    if (rateError) throw rateError;
    if ((count || 0) >= 10) return respond({ error: 'Too many sign-in attempts. Try again shortly.' }, 429);
    const { error: logError } = await db.from('auth_request_logs').insert({ ip, endpoint: 'atproto-auth' });
    if (logError) throw logError;
    const runtime = await createAtprotoClient(db, proof);
    try {
      if (body.action === 'start') {
        const handle = atprotoHandle(body.handle);
        const linkUserId = body.link === true ? (await requireUser(req)).user.id : null;
        const authorizationUrl = await runtime.client.authorize(handle, {
          scope: ATPROTO_SCOPE, state: JSON.stringify({ linkUserId, handle }),
          signal: AbortSignal.timeout(30000),
        });
        return respond({ authorizationUrl: authorizationUrl.href, state: runtime.getAuthorizationState() });
      }
      if (body.action !== 'callback') throw new HttpError(400, 'Unknown sign-in action');
      const { session, state } = await runtime.client.callback(atprotoCallbackParams(body));
      // The official client validates token sub against DID/PDS/issuer discovery.
      // A handle supplied in a callback or token from another issuer is not proof.
      const did = session.did;
      const intent = JSON.parse(state || '{}') as { linkUserId?: string | null; handle?: string };
      try {
        if (intent.linkUserId) {
          const { user } = await requireUser(req);
          if (user.id !== intent.linkUserId) throw new HttpError(403, 'The original Nolto session is required to link accounts');
        }
        return await atprotoLock(db)(`identity:${did}`, async () => {
          const { data: identity, error } = await db.from('atproto_identities').select('user_id').eq('did', did).maybeSingle();
          if (error) throw error;
          if (identity && intent.linkUserId && identity.user_id !== intent.linkUserId) {
            throw new HttpError(409, 'This Bluesky account is linked to another Nolto account');
          }
          let userId: string = intent.linkUserId || identity?.user_id;
          let createdUser: string | undefined;
          if (!userId) {
            const base = (intent.handle?.split('.')[0] || 'member').replace(/[^a-z0-9_]/g, '').slice(0, 14) || 'member';
            const username = `${base}_${randomToken().slice(0, 8)}`;
            const { data: created, error: createError } = await db.auth.admin.createUser({
              email: `${randomToken()}@signin.nolto.invalid`, email_confirm: true,
              user_metadata: { preferred_username: username, fullname: base },
              app_metadata: { login_provider: 'atproto' },
            });
            if (createError || !created.user) throw createError || new Error('Account creation failed');
            userId = created.user.id;
            createdUser = userId;
          }
          try {
            const { data: profile, error: profileError } = await db.from('profiles').select('id,deleted_at').eq('id', userId).single();
            const { data: banned, error: banError } = await db.rpc('is_user_banned', { check_user_id: userId });
            if (profileError || banError || !profile || profile.deleted_at || banned) throw new HttpError(403, 'This Nolto account is unavailable');
            if (!identity) {
              const { error: linkError } = await db.from('atproto_identities').insert({ did, user_id: userId });
              if (linkError) throw new HttpError(409, 'The account could not be linked. It may already have a Bluesky identity.');
            }
          } catch (error) {
            if (createdUser) {
              const { error: cleanupError } = await db.auth.admin.deleteUser(createdUser);
              if (cleanupError) console.error('AT Protocol account setup needs cleanup');
            }
            throw error;
          }
          // Linking an existing session never replaces it or weakens its MFA.
          if (intent.linkUserId) return respond({ linked: true });
          const { data: account, error: accountError } = await db.auth.admin.getUserById(userId);
          if (accountError || !account.user?.email) throw new Error('Local identity unavailable');
          const { data: login, error: loginError } = await db.auth.admin.generateLink({ type: 'magiclink', email: account.user.email });
          if (loginError || !login.properties.hashed_token) throw loginError || new Error('Session creation failed');
          return respond({ tokenHash: login.properties.hashed_token, isNewUser: !!createdUser });
        });
      } finally {
        // Do not keep access or refresh tokens for future scraping or cross-posting.
        await session.signOut().catch(() => console.warn('Provider token revocation unavailable; tokens discarded'));
      }
    } finally { runtime.discardTokens(); }
  } catch (error) {
    if (error instanceof HttpError) return respond({ error: error.message }, error.status);
    console.error('AT Protocol sign-in failed', error instanceof Error ? error.name : 'Unknown error');
    return respond({ error: 'Sign-in could not be completed. Start again and check your account address.' }, 400);
  }
});
