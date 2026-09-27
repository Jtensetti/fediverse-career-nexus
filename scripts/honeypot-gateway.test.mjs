import test from 'node:test';
import assert from 'node:assert/strict';
import { ipGuard, isHoneypotPath, isFederationPath } from '../deploy/nolto-gateway.mjs';

const env = { GATEWAY_GUARD_SECRET: 'x'.repeat(40), SUPABASE_ORIGIN: 'https://backend.example.com' };
const req = (path, ip) => [new Request(`https://nolto.social${path}`, { headers: { 'cf-connecting-ip': ip } }), new URL(`https://nolto.social${path}`)];

test('honeypot paths never overlap real or federation routes', () => {
  for (const p of ['/wp-login.php', '/.env', '/.git/config', '/wp-admin/x', '/nolto-trap-7f3a/']) assert.ok(isHoneypotPath(p), p);
  for (const p of ['/', '/jobs', '/profile/env', '/.well-known/webfinger', '/api/v1/instance', '/functions/v1/inbox', '/environment']) assert.ok(!isHoneypotPath(p), p);
  for (const p of ['/.well-known/webfinger', '/api/v1/timelines/home', '/functions/v1/inbox', '/oauth/token', '/nodeinfo/2.0']) assert.ok(isFederationPath(p), p);
});

test('trap blocks the IP for the website but never for federation', async (t) => {
  const bodies = [];
  t.mock.method(globalThis, 'fetch', async (_url, init) => {
    const body = JSON.parse(init.body); bodies.push(body);
    return new Response(JSON.stringify({ blockedUntil: new Date(Date.now() + 86400000).toISOString() }));
  });
  assert.equal((await ipGuard(...req('/.env', '203.0.113.9'), env)).status, 404);
  assert.equal(bodies[0].action, 'hit');
  assert.equal((await ipGuard(...req('/jobs', '203.0.113.9'), env)).status, 403);
  assert.equal(await ipGuard(...req('/functions/v1/inbox', '203.0.113.9'), env), null);
  assert.equal(await ipGuard(...req('/api/v1/instance', '203.0.113.9'), env), null);
});

test('guard fails open and is off without a secret', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('down'); });
  assert.equal(await ipGuard(...req('/jobs', '198.51.100.7'), env), null);
  assert.equal(await ipGuard(...req('/.env', '198.51.100.8'), {}), null);
});
