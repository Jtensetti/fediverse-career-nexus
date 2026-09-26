import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

// Exercise the real application client and installed SDK. Only the HTTP boundary
// is synthetic; a broken Web Locks API must never block this client's auth work.
const sourceUrl = new URL('../src/lib/supabase.ts', import.meta.url);
let sequence = 0;
registerHooks({
  load(url, context, next) {
    if (url.split('?')[0] === sourceUrl.href) {
      const api = 'https://auth-regression-' + new URL(url).searchParams.get('fixture') + '.supabase.co';
      const source = readFileSync(sourceUrl, 'utf8')
        .replaceAll('import.meta.env.VITE_SUPABASE_URL', JSON.stringify(api))
        .replaceAll('import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY', '"synthetic-public-key"');
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText };
    }
    return next(url, context);
  },
});

const user = { id: 'synthetic-user', aud: 'authenticated', role: 'authenticated',
  email: 'auth@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
function session(label, expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return {
    access_token: [encode({ alg: 'HS256', typ: 'JWT' }), encode({ sub: user.id, exp: expiresAt, aal: 'aal1', label }), Buffer.from('synthetic-signature').toString('base64url')].join('.'),
    refresh_token: `synthetic-refresh-${label}`, token_type: 'bearer', expires_in: 3600, expires_at: expiresAt, user,
  };
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function fixture(t, path = '/auth') {
  const id = ++sequence;
  const api = `https://auth-regression-${id}.supabase.co`;
  const storageKey = `sb-auth-regression-${id}-auth-token`;
  const dom = new JSDOM('', { url: 'https://app.example.test' + path });
  const saved = new Map();
  const clients = [];
  const requests = [];
  let lockCalls = 0;
  let fetcher = async url => {
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    if (url.pathname === '/rest/v1/profiles') return json([{ id: user.id }]);
    throw new Error('Unexpected test request: ' + url.pathname);
  };
  function replace(name, value) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  }
  replace('window', dom.window);
  replace('document', dom.window.document);
  replace('localStorage', dom.window.localStorage);
  replace('navigator', { locks: { request: async () => {
    lockCalls++;
    throw new Error(`Acquiring an exclusive Navigator LockManager lock "lock:${storageKey}" immediately failed`);
  } } });
  replace('fetch', async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return fetcher(new URL(request.url), request);
  });
  t.after(async () => {
    for (const client of clients) {
      if (client.auth.dispose) await client.auth.dispose();
      else {
        await client.auth.stopAutoRefresh();
        client.auth.broadcastChannel?.close();
      }
    }
    dom.window.close();
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  });
  const { supabase } = await import(sourceUrl.href + '?fixture=' + id);
  clients.push(supabase);
  const initialized = await supabase.auth.initialize();
  assert.equal(initialized.error, null, 'client initialization must succeed with unavailable Web Locks');
  return {
    client: supabase, api, requests, storage: dom.window.localStorage,
    setFetch: handler => { fetcher = handler; },
    store: value => dom.window.localStorage.setItem(storageKey, JSON.stringify(value)),
    read: () => JSON.parse(dom.window.localStorage.getItem(storageKey)),
    assertNoLocks: () => assert.equal(lockCalls, 0, 'auth must use the SDK default coordination, never Navigator locks'),
  };
}

test('auth initializes, restores a session and queries data when Navigator locks fail', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  const signedIn = session('initial');
  assert.equal((await f.client.auth.setSession(signedIn)).error, null);
  const results = await Promise.all(Array.from({ length: 8 }, () => f.client.auth.getSession()));
  for (const result of results) {
    assert.equal(result.error, null);
    assert.equal(result.data.session.access_token, signedIn.access_token);
  }
  const result = await f.client.from('profiles').select('id');
  assert.equal(result.error, null);
  assert.deepEqual(result.data, [{ id: user.id }]);
  assert.equal(f.requests.at(-1).headers.get('authorization'), 'Bearer ' + signedIn.access_token);
  f.assertNoLocks();
});

test('concurrent expired-session reads share one refresh request', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  f.store(session('expired', Math.floor(Date.now() / 1000) - 60));
  const rotated = session('rotated');
  const started = Promise.withResolvers(), release = Promise.withResolvers();
  let refreshes = 0;
  f.setFetch(async url => {
    assert.equal(url.pathname, '/auth/v1/token');
    refreshes++;
    started.resolve();
    await release.promise;
    return json(rotated);
  });
  const reads = Array.from({ length: 8 }, () => f.client.auth.getSession());
  await started.promise;
  release.resolve();
  for (const result of await Promise.all(reads)) {
    assert.equal(result.error, null);
    assert.equal(result.data.session.access_token, rotated.access_token);
  }
  assert.equal(refreshes, 1);
  assert.equal(f.read().refresh_token, rotated.refresh_token);
  f.assertNoLocks();
});

test('a refresh that loses to another tab uses its stored token for the next data query', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  f.store(session('expired', Math.floor(Date.now() / 1000) - 60));
  const winner = session('other-tab'), loser = session('late-response');
  const started = Promise.withResolvers(), release = Promise.withResolvers();
  f.setFetch(async url => {
    if (url.pathname === '/rest/v1/profiles') return json([{ id: user.id }]);
    assert.equal(url.pathname, '/auth/v1/token');
    started.resolve();
    await release.promise;
    return json(loser);
  });
  // Start a data query while its access-token lookup must refresh the session.
  const query = f.client.from('profiles').select('id').then(result => result);
  await started.promise;
  f.store(winner); // Another tab commits its rotation while our HTTP request is pending.
  release.resolve();
  const result = await query;
  assert.equal(result.error, null);
  assert.equal(f.requests.at(-1).headers.get('authorization'), 'Bearer ' + winner.access_token);
  assert.equal(f.read().refresh_token, winner.refresh_token, 'the late response must not overwrite the winner');
  f.assertNoLocks();
});

test('sign-out during refresh cannot resurrect the cleared session', { timeout: 5000 }, async t => {
  const f = await fixture(t);
  f.store(session('initial'));
  const started = Promise.withResolvers(), release = Promise.withResolvers();
  const events = [];
  f.client.auth.onAuthStateChange(event => { events.push(event); });
  f.setFetch(async url => {
    if (url.pathname === '/auth/v1/logout') return new Response(null, { status: 204 });
    assert.equal(url.pathname, '/auth/v1/token');
    started.resolve();
    await release.promise;
    return json(session('late-refresh'));
  });
  const refresh = f.client.auth.refreshSession();
  await started.promise;
  assert.equal((await f.client.auth.signOut()).error, null);
  assert.equal(f.read(), null);
  release.resolve();
  const result = await refresh;
  assert.equal(result.error?.name, 'AuthRefreshDiscardedError');
  assert.equal(f.read(), null);
  assert.equal((await f.client.auth.getSession()).data.session, null);
  assert.ok(events.includes('SIGNED_OUT'));
  assert.ok(!events.includes('TOKEN_REFRESHED'));
  f.assertNoLocks();
});

test('managed social callback still requires explicit token validation before a session is saved', { timeout: 5000 }, async t => {
  const tokens = session('social');
  const f = await fixture(t, '/auth/social/callback#access_token=' + tokens.access_token + '&refresh_token=' + tokens.refresh_token);
  assert.equal(f.read(), null);
  assert.equal(f.requests.length, 0, 'SDK must not consume the fragment before SocialCallback validates browser state');
  assert.equal((await f.client.auth.setSession(tokens)).error, null);
  assert.equal(f.requests[0].url, f.api + '/auth/v1/user');
  assert.equal(f.read().access_token, tokens.access_token);
  f.assertNoLocks();
});
