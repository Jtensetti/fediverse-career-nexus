import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import gateway from '../deploy/nolto-gateway.mjs';

test('gateway routes discovery and signed inbox bytes while retaining canonical UI/OAuth origin', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (input, init) => { calls.push({ input, init }); return new Response('ok'); };
  const env = { SUPABASE_ORIGIN: 'https://backend.example.com' };
  try {
    await gateway.fetch(new Request('https://nolto.social/.well-known/webfinger?resource=acct%3Aalice%40nolto.social'), env);
    assert.equal(String(calls.at(-1).input), 'https://backend.example.com/functions/v1/webfinger?resource=acct%3Aalice%40nolto.social');
    const inbox = new Request('https://nolto.social/functions/v1/inbox/alice', { method: 'POST', body: '{"type":"Like"}', headers: { 'x-forwarded-host': 'attacker.example', forwarded: 'host=attacker.example', signature: 'test-signature', digest: 'test-digest' } });
    await gateway.fetch(inbox, env);
    const delivery = calls.at(-1);
    assert.equal(delivery.init.headers.get('x-forwarded-host'), null);
    assert.equal(delivery.init.headers.get('forwarded'), null);
    assert.equal(delivery.init.headers.get('signature'), 'test-signature');
    assert.equal(await new Response(delivery.init.body).text(), '{"type":"Like"}');
    const callback = new Request('https://nolto.social/auth/social/callback?flow=test');
    await gateway.fetch(callback, env);
    assert.equal(calls.at(-1).input, callback);
    const consent = new Request('https://nolto.social/oauth/authorize?client_id=example');
    await gateway.fetch(consent,env);
    assert.equal(calls.at(-1).input,consent);
    const broker = new Request('https://nolto.social/~oauth/initiate?provider=google');
    await gateway.fetch(broker,env);
    assert.equal(calls.at(-1).input,broker);
    const token = new Request('https://nolto.social/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',authorization:'Basic fixture','x-forwarded-for':'forged'},body:'grant_type=authorization_code&code=fixture'});
    await gateway.fetch(token,env);
    assert.equal(String(calls.at(-1).input),'https://backend.example.com/functions/v1/oauth-authorization-server/token');
    assert.equal(calls.at(-1).init.headers.get('authorization'),'Basic fixture');
    assert.equal(calls.at(-1).init.headers.get('x-forwarded-for'),null);
    assert.equal(await new Response(calls.at(-1).init.body).text(),'grant_type=authorization_code&code=fixture');
    await gateway.fetch(new Request('https://nolto.social/api/v1/timelines/home?max_id=9007199254740993'),env);
    assert.equal(String(calls.at(-1).input),'https://backend.example.com/functions/v1/mastodon-api/api/v1/timelines/home?max_id=9007199254740993');
    await gateway.fetch(new Request('https://nolto.social/.well-known/oauth-authorization-server'),env);
    assert.equal(String(calls.at(-1).input),'https://backend.example.com/functions/v1/oauth-authorization-server');
  } finally { globalThis.fetch = original; }
});

test('the deployed Worker routes cover every protocol path, including token queries, without taking over browser sign-in', async () => {
  const config = JSON.parse(await readFile(new URL('../deploy/wrangler.jsonc', import.meta.url), 'utf8'));
  const patterns = config.routes.map(({ pattern }) =>
    new RegExp('^' + pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'));
  assert.ok(patterns.length > 0);
  const routes = url => patterns.some(pattern => pattern.test(url.replace(/^https:\/\//, '')));
  const env = { SUPABASE_ORIGIN: 'https://backend.example.com' };
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => { calls.push({ input, init }); return new Response('ok'); };
  try {
    for (const [path, target] of [
      ['/.well-known/webfinger?resource=acct%3Aalice%40nolto.social', '/functions/v1/webfinger?resource=acct%3Aalice%40nolto.social'],
      ['/.well-known/nodeinfo', '/functions/v1/nodeinfo'],
      ['/.well-known/host-meta', '/functions/v1/host-meta'],
      ['/.well-known/oauth-authorization-server', '/functions/v1/oauth-authorization-server'],
      ['/nodeinfo/2.0', '/functions/v1/nodeinfo/2.0'],
      ['/functions/v1/inbox/alice', '/functions/v1/inbox/alice'],
      ['/functions/v1/actor/alice', '/functions/v1/actor/alice'],
      ['/api/v1/instance', '/functions/v1/mastodon-api/api/v1/instance'],
      ['/api/v2/instance', '/functions/v1/mastodon-api/api/v2/instance'],
      ['/oauth/token', '/functions/v1/oauth-authorization-server/token'],
      ['/oauth/token?probe=1', '/functions/v1/oauth-authorization-server/token?probe=1'],
      ['/oauth/revoke', '/functions/v1/oauth-authorization-server/revoke'],
    ]) {
      const url = 'https://nolto.social'+path;
      assert.ok(routes(url), 'Wrangler does not send '+path+' to the Worker');
      await gateway.fetch(new Request(url), env);
      assert.equal(String(calls.at(-1).input), env.SUPABASE_ORIGIN+target);
      assert.equal(calls.at(-1).init.redirect, 'manual');
    }
    for (const path of ['/oauth/authorize?client_id=example', '/~oauth/initiate?provider=apple', '/auth/atproto/callback', '/auth/social/callback', '/feed', '/assets/main.js']) {
      assert.equal(routes('https://nolto.social'+path), false, 'Browser path must remain on the existing host');
    }
    assert.equal(routes('https://elsewhere.example/api/v1/instance'), false);
    assert.ok(routes('https://nolto.social/.well-known/atproto-did?probe=1'));
    assert.equal(routes('https://alice.nolto.social/.well-known/atproto-did'), false);
    const similar = new Request('https://nolto.social/oauth/token-unrelated');
    await gateway.fetch(similar, env);
    assert.equal(calls.at(-1).input, similar, 'Wildcard route must not broaden the backend endpoint');
  } finally { globalThis.fetch = original; }
});

test('bad backend configuration fails protocol routes closed while leaving the existing website reachable', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async request => { calls.push(request); return new Response('existing website'); };
  try {
    for (const origin of [undefined, 'invalid', 'http://backend.example', 'https://nolto.social', 'https://user:pass@backend.example', 'https://backend.example/path', 'https://backend.example?x=1']) {
      const env = { SUPABASE_ORIGIN: origin };
      assert.equal((await gateway.fetch(new Request('https://nolto.social/.well-known/webfinger'), env)).status, 503);
      const home = new Request('https://nolto.social/');
      assert.equal(await (await gateway.fetch(home, env)).text(), 'existing website');
      assert.equal(calls.at(-1), home);
    }
    assert.equal(calls.length, 7, 'Invalid backend URLs must never be fetched');
  } finally { globalThis.fetch = original; }
});

test('split-domain gateway keeps protocol requests on the apex and sends browser navigation to www without a self-fetch', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (input, init) => { calls.push({ input, init }); return new Response('backend'); };
  const env = { GATEWAY_MODE: 'split', FRONTEND_ORIGIN: 'https://www.nolto.social', SUPABASE_ORIGIN: 'https://backend.example.com' };
  try {
    for (const path of ['/', '/feed', '/oauth/authorize?client_id=fixture&state=keep%2Bthis', '/auth/social/callback?flow=fixture', '//attacker.example/path']) {
      const response = await gateway.fetch(new Request('https://nolto.social'+path), env);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), 'https://www.nolto.social'+path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    const post = await gateway.fetch(new Request('https://nolto.social/~oauth/initiate', { method: 'POST', body: 'private browser data' }), env);
    assert.equal(post.status, 405);
    assert.equal(post.headers.get('location'), null);
    assert.equal(calls.length, 0, 'Browser navigation must never fetch the apex or proxy login cookies to Lovable');
    for (const frontend of [undefined, 'https://nolto.social', 'https://backend.example.com', 'http://www.nolto.social', 'https://user:pass@www.nolto.social', 'https://www.nolto.social/path']) {
      assert.equal((await gateway.fetch(new Request('https://nolto.social/'), { ...env, FRONTEND_ORIGIN: frontend })).status, 503);
    }
    await gateway.fetch(new Request('https://nolto.social/.well-known/webfinger?resource=acct%3Aalice%40nolto.social'), env);
    assert.equal(String(calls.at(-1).input), 'https://backend.example.com/functions/v1/webfinger?resource=acct%3Aalice%40nolto.social');
    const token = new Request('https://nolto.social/oauth/token', { method: 'POST', body: 'code=fixture' });
    await gateway.fetch(token, env);
    assert.equal(String(calls.at(-1).input), 'https://backend.example.com/functions/v1/oauth-authorization-server/token');
    assert.equal(await new Response(calls.at(-1).init.body).text(), 'code=fixture');
    assert.equal(calls.length, 2);
    const config = JSON.parse(await readFile(new URL('../deploy/wrangler.split.jsonc', import.meta.url), 'utf8'));
    assert.deepEqual(config.routes, [{ pattern: 'nolto.social', custom_domain: true }]);
    assert.equal(config.vars.GATEWAY_MODE, 'split');
    assert.equal(config.vars.FRONTEND_ORIGIN, 'https://www.nolto.social');
  } finally { globalThis.fetch = original; }
});

test('AT Protocol resolves only the configured apex DID without upstream requests or redirects', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => assert.fail('Handle verification must not contact an upstream');
  try {
    for (const mode of ['route', 'split']) {
      for (const did of ['did:plc:abcdefghijklmnopqrstuvwx', 'did:web:identity.example.org']) {
        const env = { GATEWAY_MODE: mode, ATPROTO_DID: did };
        const response = await gateway.fetch(new Request('https://nolto.social/.well-known/atproto-did?probe=1'), env);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
        assert.equal(response.headers.get('location'), null);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        assert.equal(await response.text(), did);
        const head = await gateway.fetch(new Request('https://nolto.social/.well-known/atproto-did', { method: 'HEAD' }), env);
        assert.equal(head.status, 200);
        assert.equal(await head.text(), '');
      }
      for (const did of [undefined, '']) {
        const response = await gateway.fetch(new Request('https://nolto.social/.well-known/atproto-did'), { GATEWAY_MODE: mode, ATPROTO_DID: did });
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('location'), null);
      }
    }
    for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
      const response = await gateway.fetch(new Request('https://nolto.social/.well-known/atproto-did', { method }), { ATPROTO_DID: 'did:plc:abcdefghijklmnopqrstuvwx' });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get('allow'), 'GET, HEAD');
    }
    for (const url of [
      'https://alice.nolto.social/.well-known/atproto-did',
      'https://www.nolto.social/.well-known/atproto-did',
      'https://admin.nolto.social/.well-known/atproto-did',
      'https://nolto.social.attacker.com/.well-known/atproto-did',
      'https://nolto.social./.well-known/atproto-did',
      'https://nolto.social:8443/.well-known/atproto-did',
      'http://nolto.social/.well-known/atproto-did',
      'https://nolto.social/.well-known/atproto-did/unexpected',
      'https://nolto.social/.well-known/atproto-did-unexpected',
      'https://attacker.com/functions/v1/inbox/alice',
    ]) {
      const response = await gateway.fetch(new Request(url), { ATPROTO_DID: 'did:plc:abcdefghijklmnopqrstuvwx' });
      assert.equal(response.status, 404, url);
      assert.equal(response.headers.get('location'), null);
    }
  } finally { globalThis.fetch = original; }
});

test('invalid AT Protocol identifiers and canonical host configuration fail closed', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => assert.fail('Invalid identity configuration must not contact an upstream');
  const request = new Request('https://nolto.social/.well-known/atproto-did');
  try {
    for (const did of [null, {}, [], 42, ' ', 'did:plc:short', 'did:plc:ABCDEFGHIJKLMNOPQRSTUVWX', 'did:plc:012345678901234567890123',
      'did:plc:abcdefghijklmnopqrstuvwx\n', 'did:web:identity.example.org:users:alice', 'did:web:identity.example.org%3A443',
      'did:web:identity.example.org/path', 'did:web:identity.example.org?x=1', 'did:web:identity.example.org#key',
      'did:web:Identity.example.org', 'did:web:localhost', 'did:web:127.0.0.1', 'did:web:identity.test', 'did:key:z6Mk123',
    ]) {
      assert.equal((await gateway.fetch(request, { ATPROTO_DID: did })).status, 503, JSON.stringify(did));
    }
    for (const domain of ['', null, {}, 'https://nolto.social', 'NOLTO.social', 'nolto.social.', 'nolto.social/path',
      'nolto.social:443', 'nolto.social@attacker.com', '*.nolto.social', 'localhost', '127.0.0.1', 'nolto.invalid',
      'nolto.social\n', 'a'.repeat(64)+'.social',
    ]) {
      assert.equal((await gateway.fetch(request, { FEDERATION_DOMAIN: domain })).status, 503, JSON.stringify(domain));
    }
    const configured = await gateway.fetch(new Request('https://identity.example.org/.well-known/atproto-did'), {
      FEDERATION_DOMAIN: 'identity.example.org', ATPROTO_DID: 'did:web:identity.example.org',
    });
    assert.equal(configured.status, 200);
    assert.equal(await configured.text(), 'did:web:identity.example.org');
    const head = await gateway.fetch(new Request(request.url, { method: 'HEAD' }), { ATPROTO_DID: 'malformed' });
    assert.equal(head.status, 503);
    assert.equal(await head.text(), '');
  } finally { globalThis.fetch = original; }
});

test('both deployment modes leave AT Protocol identity unassigned and redact invocation URLs', async () => {
  for (const filename of ['wrangler.jsonc', 'wrangler.split.jsonc']) {
    const config = JSON.parse(await readFile(new URL('../deploy/'+filename, import.meta.url), 'utf8'));
    assert.equal(config.vars.ATPROTO_DID, '');
    assert.equal(config.vars.FEDERATION_DOMAIN, 'nolto.social');
    assert.equal(config.observability.enabled, true);
    assert.equal(config.observability.logs.invocation_logs, false);
    assert.equal(config.observability.redact_query_string, true);
    assert.equal(config.observability.traces.enabled, false);
    assert.ok(config.compatibility_flags.includes('nodejs_compat'));
    assert.ok(config.routes.every(route => !route.pattern.startsWith('*')));
  }
});

test('split gateway GET redirect preserves /confirm-email?token= exactly', async () => {
  const env = { MODE: 'split', GATEWAY_MODE: 'split', FRONTEND_ORIGIN: 'https://www.nolto.social', SUPABASE_ORIGIN: 'https://backend.example.com' };
  const response = await gateway.fetch(new Request('https://nolto.social/confirm-email?token=a%2Bb%2Fc%3Dd'), env);
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get('location'));
  assert.equal(location.origin, 'https://www.nolto.social');
  assert.equal(location.pathname, '/confirm-email');
  assert.equal(location.searchParams.get('token'), 'a+b/c=d');
});
