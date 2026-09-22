import test from 'node:test';
import assert from 'node:assert/strict';
import gateway from '../deploy/nolto-gateway.mjs';

test('gateway routes discovery and signed inbox bytes while retaining canonical UI/OAuth origin', async () => {
  const original = globalThis.fetch, calls = [];
  globalThis.fetch = async (input, init) => { calls.push({ input, init }); return new Response('ok'); };
  const env = { SUPABASE_ORIGIN: 'https://backend.example.com' };
  try {
    await gateway.fetch(new Request('https://nolto.social/.well-known/webfinger?resource=acct%3Aalice%40nolto.social'), env);
    assert.equal(String(calls.at(-1).input), 'https://backend.example.com/functions/v1/webfinger?resource=acct%3Aalice%40nolto.social');
    const inbox = new Request('https://nolto.social/functions/v1/actor/alice/inbox', { method: 'POST', body: '{"type":"Like"}', headers: { 'x-forwarded-host': 'attacker.example', signature: 'test-signature', digest: 'test-digest' } });
    await gateway.fetch(inbox, env);
    const delivery = calls.at(-1);
    assert.equal(delivery.init.headers.get('x-forwarded-host'), null);
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
