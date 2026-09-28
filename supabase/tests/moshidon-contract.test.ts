import { strict as assert } from 'node:assert';
import { handleMastodonRequest } from '../functions/mastodon-api/handler.ts';
import { handleOAuthRequest } from '../functions/oauth-authorization-server/handler.ts';
import { tokenHash } from '../functions/_shared/oauth.ts';

/**
 * Transport/serialization regression for issue #51, not an Android-device test.
 * Request shapes were checked against LucasGGamerM/moshidon, branch rewrite:
 * CreateOAuthApp.java blob bb1e98713027d24fe5db2a1a947b951e84268478,
 * GetOauthToken.java blob a41d5c068b1656c5d9002ba51ebbd6defbea9c84,
 * AccountSessionManager.java blob 8555364da4817e0853c76035bab3a0c2495fe244,
 * OAuthActivity.java blob 38dca2075e8c719659b8dbed5eb1ed2c74caff39.
 * Those requests use read/write/follow/push, a native callback, and no state or
 * PKCE. Existing PKCE, exact-redirect, session and MFA protections are unchanged.
 * All Auth/database responses below are isolated fixtures: SQL authorization and
 * Android callback dispatch require their own integration/acceptance tests.
 */
const origin = 'https://fixture.example';
const clientId = '88888888-eeee-4eee-8eee-eeeeeeeeeeee';
const userId = '88888888-1111-4111-8111-111111111111';
const actorId = '88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sessionId = '88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const requestedScopes = 'read write follow push';
const callbacks = [
  'moshidon-android-auth://callback',
  'moshidon-android-debug-auth://callback',
  'moshidon-android-nightly-auth://callback',
];
type Call = { url: URL; method: string; body: Record<string, unknown> | null };
const request = (fn: string, path: string, body?: Record<string, unknown>, headers: Record<string, string> = {}) =>
  new Request(`${origin}/functions/v1/${fn}/${path}`, body === undefined
    ? { headers }
    : { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
const problem = (status: number, message: string) => new Response(JSON.stringify({ code: `PT${status}`, message }), {
  status, headers: { 'content-type': 'application/json' },
});

async function withFixture(callback: string, run: (calls: Call[]) => Promise<void>) {
  const settings: Record<string, string> = {
    SUPABASE_URL: origin, SUPABASE_ANON_KEY: 'fixture-public', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service',
    MASTODON_CLIENT_ENABLED: 'true', MASTODON_CLIENT_PILOT_USER_IDS: '',
    SITE_URL: 'https://nolto.social', FEDERATION_DOMAIN: 'nolto.social',
  };
  const previous = new Map(Object.keys(settings).map(key => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(settings)) Deno.env.set(key, value);
  const originalFetch = globalThis.fetch;
  const calls: Call[] = [];
  let app: Record<string, unknown> | undefined;
  let grantHash: unknown;
  let revoked = false;
  function reply(call: Call): unknown {
    const path = call.url.pathname;
    if (path === '/rest/v1/mastodon_clients') {
      if (call.method === 'POST') {
        assert.equal(call.body?.name, 'Moshidon');
        assert.deepEqual(call.body?.redirect_uris, [callback]);
        assert.deepEqual(call.body?.scopes, requestedScopes.split(' '));
        assert.match(String(call.body?.secret_hash), /^[a-f0-9]{64}$/);
        app = { id: clientId, name: 'Moshidon', website: 'https://github.com/LucasGGamerM/moshidon',
          redirect_uris: [callback], scopes: requestedScopes.split(' ') };
      }
      return app || null;
    }
    if (path === '/auth/v1/user') return { id: userId };
    if (/\/(current_session_is_active|current_session_is_verified|mastodon_rate_limit)$/.test(path)) return true;
    if (path.endsWith('/mastodon_issue_code')) return null;
    if (path.endsWith('/mastodon_exchange_code')) {
      grantHash = call.body?.p_token;
      return { scopes: requestedScopes.split(' '), created_at: 1, expires_in: 2592000 };
    }
    if (path.endsWith('/mastodon_identity')) {
      if (!grantHash || call.body?.p_hash !== grantHash || revoked) return problem(401, 'Invalid access token');
      return { id: 'fixture-grant', client_id: clientId, user_id: userId, actor_id: actorId, scopes: requestedScopes.split(' ') };
    }
    if (path === '/rest/v1/mastodon_grants' && call.method === 'PATCH') { revoked = true; return null; }
    if (path.endsWith('/mastodon_instance_stats')) return { user_count: 1, status_count: 0, domain_count: 0, active_month: 0 };
    if (path === '/rest/v1/mastodon_accounts') return {
      id: '42', actor_id: actorId, user_id: userId, preferred_username: 'fixture_user',
      is_remote: false, remote_actor_url: null, created_at: '2026-01-01T00:00:00.000Z',
      follower_count: 0, following_count: 0, fullname: 'Fixture User', bio: 'A public profile',
      avatar_url: null, header_url: null, email: 'must-not-escape@example.invalid',
    };
    if (path.endsWith('/mastodon_account_counts')) return [{ actor_id: actorId, statuses_count: 0 }];
    if (path.endsWith('/mastodon_home')) return [];
    throw new Error(`Unexpected fixture request: ${call.method} ${path}`);
  }
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    assert.equal(url.origin, origin, 'This test must never contact a real service');
    const call: Call = { url, method: init?.method || 'GET', body: typeof init?.body === 'string' ? JSON.parse(init.body) : null };
    calls.push(call);
    const result = reply(call);
    return Promise.resolve(result instanceof Response ? result : new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } }));
  };
  try { await run(calls); }
  finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of previous) { if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value); }
  }
}

for (const callback of callbacks) Deno.test(`Moshidon request contract: ${callback}`, async () => {
  await withFixture(callback, async calls => {
    for (const version of ['v1', 'v2']) {
      const instanceResponse = await handleMastodonRequest(request('mastodon-api', `api/${version}/instance`));
      assert.equal(instanceResponse.status, 200);
      const instance = await instanceResponse.json();
      for (const field of ['title', 'description', 'version']) assert.equal(typeof instance[field], 'string');
      assert.equal(instance[version === 'v1' ? 'uri' : 'domain'], 'nolto.social');
      assert.equal(instance.nolto.experimental, true, 'Do not advertise complete Mastodon compatibility');
    }
    const registration = await handleMastodonRequest(request('mastodon-api', 'api/v1/apps', {
      client_name: 'Moshidon', redirect_uris: callback, scopes: requestedScopes,
      website: 'https://github.com/LucasGGamerM/moshidon',
    }));
    assert.equal(registration.status, 200);
    const app = await registration.json();
    assert.equal(app.name, 'Moshidon');
    assert.equal(app.client_id, clientId);
    assert.match(app.client_secret, /^[a-f0-9]{64}$/);
    assert.equal(app.secret_hash, undefined);
    assert.equal(calls.find(call => call.method === 'POST' && call.url.pathname.endsWith('/mastodon_clients'))?.body?.secret_hash, await tokenHash(app.client_secret));

    // Mirrors AccountSessionManager.authenticate: no state or PKCE parameters.
    const authorization = { response_type: 'code', client_id: app.client_id, redirect_uri: callback, scope: requestedScopes };
    const preview = await handleOAuthRequest(request('oauth-authorization-server', `request?${new URLSearchParams(authorization)}`));
    assert.equal(preview.status, 200);
    assert.equal((await preview.json()).pkce, false);
    const jwt = btoa('{}') + '.' + btoa(JSON.stringify({ sub: userId, session_id: sessionId, aal: 'aal1' })) + '.fixture';
    const headers = { origin: 'https://nolto.social', authorization: 'Bearer ' + jwt };
    const consent = await handleOAuthRequest(request('oauth-authorization-server', 'consent', { ...authorization, decision: 'allow' }, headers));
    assert.equal(consent.status, 200);
    const destination = new URL((await consent.json()).redirect);
    assert.equal(destination.protocol + '//' + destination.host, callback);
    assert.equal(destination.searchParams.has('state'), false);
    const code = destination.searchParams.get('code');
    assert.match(code!, /^[a-f0-9]{64}$/);
    const issue = calls.find(call => call.url.pathname.endsWith('/mastodon_issue_code'))?.body;
    assert.equal(issue?.p_redirect, callback);
    assert.equal(issue?.p_user, userId);
    assert.equal(issue?.p_session, sessionId);
    assert.equal(issue?.p_challenge, null);
    assert.ok(calls.some(call => call.url.pathname === '/auth/v1/user'));
    assert.ok(calls.some(call => call.url.pathname.endsWith('/current_session_is_active')));
    assert.ok(calls.some(call => call.url.pathname.endsWith('/current_session_is_verified')));

    // Mirrors GetOauthToken: JSON body, client_secret_post, no scope on code exchange.
    const tokenResponse = await handleOAuthRequest(request('oauth-authorization-server', 'token', {
      grant_type: 'authorization_code', client_id: app.client_id, client_secret: app.client_secret, redirect_uri: callback, code: code!,
    }));
    assert.equal(tokenResponse.status, 200);
    const token = await tokenResponse.json();
    assert.equal(token.token_type, 'Bearer');
    assert.equal(token.scope, requestedScopes);
    assert.match(token.access_token, /^[a-f0-9]{64}$/);
    assert.notEqual(token.access_token, jwt);
    const bearer = { authorization: 'Bearer ' + token.access_token };
    const ownResponse = await handleMastodonRequest(request('mastodon-api', 'api/v1/accounts/verify_credentials', undefined, bearer));
    assert.equal(ownResponse.status, 200);
    const own = await ownResponse.json();
    assert.equal(own.id, '42');
    assert.equal(own.username, 'fixture_user');
    assert.equal(own.acct, 'fixture_user');
    assert.equal(own.source.privacy, 'public');
    assert.ok(Array.isArray(own.fields) && Array.isArray(own.emojis));
    assert.equal(own.email, undefined);
    assert.equal(own.user_id, undefined);
    assert.equal(own.actor_id, undefined);
    const home = await handleMastodonRequest(request('mastodon-api', 'api/v1/timelines/home', undefined, bearer));
    assert.equal(home.status, 200);
    assert.deepEqual(await home.json(), []);
    const emojis = await handleMastodonRequest(request('mastodon-api', 'api/v1/custom_emojis', undefined, bearer));
    assert.equal(emojis.status, 200);
    assert.deepEqual(await emojis.json(), []);
    const revoke = await handleOAuthRequest(request('oauth-authorization-server', 'revoke', { client_id: app.client_id, client_secret: app.client_secret, token: token.access_token }));
    assert.equal(revoke.status, 200);
    const rejected = await handleMastodonRequest(request('mastodon-api', 'api/v1/accounts/verify_credentials', undefined, bearer));
    assert.equal(rejected.status, 401, 'A rejected backend grant must not become anonymous or cached account access');
  });
});
