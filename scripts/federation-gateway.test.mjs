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
  } finally { globalThis.fetch = original; }
});
