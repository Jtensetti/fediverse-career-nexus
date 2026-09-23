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
  const config = await readFile(new URL('../deploy/wrangler.toml', import.meta.url), 'utf8');
  const patterns = [...config.matchAll(/pattern\s*=\s*"([^"]+)"/g)].map(match =>
    new RegExp('^' + match[1].split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$'));
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
    const config = await readFile(new URL('../deploy/wrangler.split.toml', import.meta.url), 'utf8');
    assert.match(config, /pattern = "nolto.social", custom_domain = true/);
    assert.match(config, /GATEWAY_MODE = "split"/);
    assert.match(config, /FRONTEND_ORIGIN = "https:\/\/www.nolto.social"/);
  } finally { globalThis.fetch = original; }
});
