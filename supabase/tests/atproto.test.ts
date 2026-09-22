import { strict as assert } from 'node:assert';
import publishedMetadata from '../../public/oauth-client-metadata.json' with { type: 'json' };
import { atprotoHandle, atprotoMetadata, atprotoCallbackParams, browserProof } from '../functions/_shared/atproto-policy.ts';
import { atprotoFetch } from '../functions/_shared/atproto-fetch.ts';
import { createAtprotoClient } from '../functions/_shared/atproto-client.ts';

Deno.test('AT Protocol login requests identity only and rejects unsafe discovery inputs', () => {
  assert.equal(atprotoHandle('@Alice.Bsky.Social'), 'alice.bsky.social');
  for (const handle of ['alice', 'https://bsky.social', '127.0.0.1', 'foo.local', 'a.123', `${'a'.repeat(64)}.com`, 'a..com', 'a.com/path']) assert.throws(() => atprotoHandle(handle));
  assert.equal(browserProof('a'.repeat(64)).length, 64);
  assert.throws(() => browserProof('short'));
  const metadata = atprotoMetadata('https://nolto.social');
  assert.deepEqual(metadata, publishedMetadata);
  assert.equal(metadata.scope, 'atproto');
  assert.deepEqual(metadata.grant_types, ['authorization_code']);
  assert.deepEqual(metadata.redirect_uris, ['https://nolto.social/auth/atproto/callback']);
  assert.equal(metadata.dpop_bound_access_tokens, true);
  assert.throws(() => atprotoMetadata('https://nolto.social/path'));
  for (const iss of ['http://example.com', 'https://localhost', 'https://example.com/path']) assert.throws(() => atprotoCallbackParams({ state: 'state', code: 'code', iss }));
});

Deno.test('OAuth transport pins the checked IP while retaining the HTTPS hostname and blocks unsafe DNS', async () => {
  const originals = { dns: Deno.resolveDns, client: Deno.createHttpClient, fetch: globalThis.fetch };
  let addresses = ['8.8.8.8'], connections = 0, closed = 0, body = '{}';
  try {
    Deno.resolveDns = (() => Promise.resolve(addresses)) as unknown as typeof Deno.resolveDns;
    Deno.createHttpClient = ((options: Deno.CreateHttpClientOptions) => {
      connections++; assert.deepEqual(options.proxy, { transport: 'tcp', hostname: '8.8.8.8', port: 443 });
      return { close: () => { closed++; } } as Deno.HttpClient;
    }) as typeof Deno.createHttpClient;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit & { client?: Deno.HttpClient }) => {
      assert.equal((input as Request).url, 'https://oauth.example.com/token');
      assert.equal(init?.redirect, 'error');
      assert.ok(init?.client); assert.ok(init?.signal);
      return new Response(body);
    }) as typeof fetch;
    assert.equal(await (await atprotoFetch('https://oauth.example.com/token')).text(), '{}');
    assert.equal(closed, 1);
    addresses = ['8.8.8.8', '127.0.0.1'];
    await assert.rejects(() => atprotoFetch('https://oauth.example.com/token'), /not public/);
    assert.equal(connections, 1);
    addresses = ['8.8.8.8']; body = 'x'.repeat(2 * 1024 * 1024 + 1);
    await assert.rejects(() => atprotoFetch('https://oauth.example.com/token'), /large|limit/i);
    assert.equal(closed, 2);
  } finally { Deno.resolveDns = originals.dns; Deno.createHttpClient = originals.client; globalThis.fetch = originals.fetch; }
});

// The real SDK runs against an isolated provider. No live account, token or
// network request is involved. State persists between distinct request clients.
function providerFixture() {
  const did = 'did:plc:abcdefghijklmnopqrstuvwx';
  const issuer = 'https://auth.example.com';
  const pds = 'https://pds.example.com';
  const states = new Map<string, Record<string, string>>();
  let tokenCalls = 0, parCalls = 0, par: URLSearchParams, wrongSubject = false;
  const db = {
    rpc: () => Promise.resolve({ data: true }),
    from: (table: string) => ({
      insert: (row: Record<string, string>) => { states.set(row.state_hash, row); return Promise.resolve({}); },
      delete: () => {
        const filters: Record<string, string> = {};
        const result = { eq: (key: string, value: string) => { filters[key] = value; return result; },
          gt: () => result, select: () => result,
          maybeSingle: () => {
            const row = states.get(filters.state_hash);
            if (!row || row.browser_proof_hash !== filters.browser_proof_hash) return Promise.resolve({ data: null });
            states.delete(filters.state_hash); return Promise.resolve({ data: row });
          },
          then: (resolve: (value: object) => unknown) => {
            if (table === 'atproto_oauth_states' && states.get(filters.state_hash)?.browser_proof_hash === filters.browser_proof_hash) states.delete(filters.state_hash);
            return Promise.resolve(resolve({}));
          },
        }; return result;
      },
    }),
  };
  const requestFetch: typeof atprotoFetch = async (input, init) => {
    const request = new Request(input, init), url = new URL(request.url);
    const json = (value: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(value, { status, headers });
    if (url.pathname === '/xrpc/com.atproto.identity.resolveHandle') return json({ did });
    if (url.hostname === 'plc.directory') {
      const subject = decodeURIComponent(url.pathname.slice(1));
      return json({ id: subject, alsoKnownAs: ['at://alice.bsky.social'], service: [{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: subject === did ? pds : 'https://other-pds.example.com' }] });
    }
    if (url.pathname === '/.well-known/oauth-protected-resource') return json({ resource: url.origin, authorization_servers: [url.origin === pds ? issuer : 'https://other-auth.example.com'] });
    if (url.pathname === '/.well-known/oauth-authorization-server') return json({
      issuer: url.origin, authorization_endpoint: `${url.origin}/authorize`, token_endpoint: `${url.origin}/token`,
      pushed_authorization_request_endpoint: `${url.origin}/par`, revocation_endpoint: `${url.origin}/revoke`,
      require_pushed_authorization_requests: true, response_types_supported: ['code'], grant_types_supported: ['authorization_code'],
      scopes_supported: ['atproto'], token_endpoint_auth_methods_supported: ['none'], code_challenge_methods_supported: ['S256'],
      dpop_signing_alg_values_supported: ['ES256'], authorization_response_iss_parameter_supported: true, client_id_metadata_document_supported: true,
    });
    if (url.pathname === '/par') {
      parCalls++; assert.ok(request.headers.get('dpop'));
      par = new URLSearchParams(await request.text());
      assert.equal(par.get('scope'), 'atproto'); assert.equal(par.get('code_challenge_method'), 'S256');
      return json({ request_uri: 'urn:ietf:params:oauth:request_uri:isolated-test', expires_in: 60 }, 201);
    }
    if (url.pathname === '/token') {
      tokenCalls++; assert.ok(request.headers.get('dpop'));
      if (tokenCalls === 1) return json({ error: 'use_dpop_nonce' }, 400, { 'DPoP-Nonce': 'test-provider-nonce' });
      const payload = JSON.parse(atob(request.headers.get('dpop')!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      assert.equal(payload.nonce, 'test-provider-nonce');
      const tokenRequest = new URLSearchParams(await request.text());
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tokenRequest.get('code_verifier')!));
      const challenge = btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      assert.equal(challenge, par.get('code_challenge'));
      return json({ access_token: 'isolated-test-token', token_type: 'DPoP', scope: 'atproto', expires_in: 60, sub: wrongSubject ? 'did:plc:zyxwvutsrqponmlkjihgfedc' : did });
    }
    if (url.pathname === '/revoke') return new Response(null, { status: 200 });
    throw new Error(`Unexpected provider request: ${url.origin}${url.pathname}`);
  };
  return { did, issuer, states, db, requestFetch, counts: () => ({ tokenCalls, parCalls }), wrongSubject: () => { wrongSubject = true; } };
}

Deno.test('real SDK uses PAR, PKCE and DPoP; state requires the starting browser and cannot be replayed', async () => {
  const previous = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  Deno.env.set('TOKEN_ENCRYPTION_KEY', 'isolated-atproto-test-secret-not-for-production');
  try {
    const fixture = providerFixture(), proof = 'a'.repeat(64);
    const start = await createAtprotoClient(fixture.db as never, proof, fixture.requestFetch);
    const url = await start.client.authorize('alice.bsky.social', { scope: 'atproto', state: 'login-intent' });
    assert.equal(url.origin, fixture.issuer); assert.equal(fixture.counts().parCalls, 1);
    assert.ok([...fixture.states.values()][0].encrypted_state.startsWith('v2:'));
    assert.ok(![...fixture.states.values()][0].encrypted_state.includes('login-intent'));
    const params = new URLSearchParams({ state: start.getAuthorizationState()!, code: 'isolated-code', iss: fixture.issuer });
    const wrongBrowser = await createAtprotoClient(fixture.db as never, 'b'.repeat(64), fixture.requestFetch);
    await assert.rejects(() => wrongBrowser.client.callback(params));
    assert.equal(fixture.states.size, 1); assert.equal(fixture.counts().tokenCalls, 0);
    const callback = await createAtprotoClient(fixture.db as never, proof, fixture.requestFetch);
    const { session, state } = await callback.client.callback(params);
    assert.equal(session.did, fixture.did); assert.equal(state, 'login-intent');
    assert.equal(fixture.counts().tokenCalls, 2); assert.equal(fixture.states.size, 0);
    await session.signOut(); callback.discardTokens();
    await assert.rejects(() => callback.client.callback(params));
    assert.equal(fixture.counts().tokenCalls, 2);
  } finally { if (previous === undefined) Deno.env.delete('TOKEN_ENCRYPTION_KEY'); else Deno.env.set('TOKEN_ENCRYPTION_KEY', previous); }
});

Deno.test('real SDK rejects an issuer swap and a token subject belonging to another PDS issuer', async () => {
  const previous = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  Deno.env.set('TOKEN_ENCRYPTION_KEY', 'isolated-atproto-test-secret-not-for-production');
  try {
    for (const attack of ['issuer', 'subject']) {
      const fixture = providerFixture(), proof = 'c'.repeat(64);
      const start = await createAtprotoClient(fixture.db as never, proof, fixture.requestFetch);
      await start.client.authorize('alice.bsky.social', { scope: 'atproto' });
      if (attack === 'subject') fixture.wrongSubject();
      const callback = await createAtprotoClient(fixture.db as never, proof, fixture.requestFetch);
      await assert.rejects(() => callback.client.callback(new URLSearchParams({ state: start.getAuthorizationState()!, code: 'isolated-code', iss: attack === 'issuer' ? 'https://other-auth.example.com' : fixture.issuer })));
      if (attack === 'issuer') assert.equal(fixture.counts().tokenCalls, 0);
    }
  } finally { if (previous === undefined) Deno.env.delete('TOKEN_ENCRYPTION_KEY'); else Deno.env.set('TOKEN_ENCRYPTION_KEY', previous); }
});
