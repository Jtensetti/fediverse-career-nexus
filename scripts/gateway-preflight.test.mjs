import assert from 'node:assert/strict';
import test from 'node:test';
import { checkGateway } from './check-gateway.mjs';

function fixture({ loop = false, spa = false } = {}) {
  return async (url, options) => {
    assert.equal(options.redirect, 'manual');
    assert.equal(options.method, undefined, 'Preflight must only read public endpoints');
    const target = new URL(url);
    const json = (body, type) => new Response(JSON.stringify(body), { headers: { 'content-type': type } });
    const html = () => new Response('<div id="root"></div>', { headers: { 'content-type': 'text/html' } });
    if (target.origin === 'https://www.nolto.social') {
      if (loop) return new Response(null, { status: 302, headers: { location: 'https://nolto.social/' } });
      if (target.pathname.startsWith('/embed/')) return new Response('window.Nolto = {requestProfile() {}}', { headers: { 'content-type': 'application/javascript' } });
      return html();
    }
    if (target.origin === 'https://nolto.social' && spa) return html();
    if (target.pathname === '/') return new Response(null, { status: 302, headers: { location: 'https://www.nolto.social/' } });
    const actor = 'https://nolto.social/functions/v1/actor/alice';
    if (target.pathname.endsWith('/webfinger')) return json({ subject: 'acct:alice@nolto.social', links: [{ rel: 'self', type: 'application/activity+json', href: actor }] }, 'application/jrd+json');
    if (target.pathname.endsWith('/actor/alice')) return json({ id: actor, publicKey: { owner: actor }, inbox: 'https://nolto.social/functions/v1/inbox/alice' }, 'application/activity+json');
    throw new Error('Unexpected URL');
  };
}

test('routing preflight separates a healthy backend from a broken public proxy and detects a www redirect loop', async () => {
  const run = fetcher => checkGateway('alice@nolto.social', 'https://www.nolto.social', 'https://backend.example', fetcher);
  assert.equal((await run(fixture())).ok, true);
  const missing = await run(fixture({ spa: true }));
  assert.equal(missing.ok, false);
  assert.equal(missing.checks.find(check => check.name === 'backend-webfinger').ok, true);
  assert.equal(missing.checks.find(check => check.name === 'canonical-webfinger').ok, false);
  assert.equal(missing.checks.find(check => check.name === 'canonical-actor').ok, false);
  const loop = await run(fixture({ loop: true }));
  assert.equal(loop.ok, false);
  assert.equal(loop.checks.find(check => check.name === 'website').status, 302);
  assert.equal(loop.checks.find(check => check.name === 'browser-consent-route').ok, false);
});
