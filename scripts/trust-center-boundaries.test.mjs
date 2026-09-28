import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from 'next-themes';
import gateway, { websitePolicy } from '../deploy/nolto-gateway.mjs';
import { realtimeSocketUrl, realtimeTransport } from '../src/lib/realtimeTransport.ts';

const backend = 'https://anknmcmqljejabxbeohv.supabase.co';
const socket = backend.replace('https:', 'wss:') + '/realtime/v1/websocket?apikey=public&vsn=1.0.0';

test('only the managed production socket uses Nolto; query, protocols and SDK lifecycle are retained', () => {
  assert.equal(realtimeSocketUrl(socket, backend, 'https://nolto.social'), socket.replace('anknmcmqljejabxbeohv.supabase.co', 'nolto.social'));
  for (const [address, base, page] of [
    [socket, backend, 'http://localhost:8080'], [socket, backend, 'https://preview.lovable.app'],
    [socket, 'https://other.supabase.co', 'https://nolto.social'],
    [socket.replace('/websocket?', '/websocket-other?'), backend, 'https://nolto.social'],
    [socket.replace('.supabase.co', '.supabase.co.evil.example'), backend, 'https://nolto.social'],
  ]) assert.equal(realtimeSocketUrl(address, base, page), address);
  const original = globalThis.WebSocket;
  try {
    globalThis.WebSocket = class {
      static OPEN = 1;
      constructor(url, protocols) { this.url = url; this.protocols = protocols; }
      send(data) { this.sent = data; }
      close(code) { this.closed = code; }
    };
    const Transport = realtimeTransport(backend, 'https://nolto.social');
    const ws = new Transport(socket, ['fixture']);
    assert.equal(Transport.OPEN, 1);
    assert.equal(ws.url, realtimeSocketUrl(socket, backend, 'https://nolto.social'));
    assert.deepEqual(ws.protocols, ['fixture']);
    ws.send('JWT and subscription payload'); assert.equal(ws.sent, 'JWT and subscription payload');
    ws.close(1000); assert.equal(ws.closed, 1000);
  } finally { globalThis.WebSocket = original; }
});

test('HTML response policy blocks framing and scripts without changing managed login cookies or streamed bodies', async () => {
  const original = globalThis.fetch;
  try {
    for (const path of ['/', '/trust-center', '/auth', '/~oauth/initiate', '/oauth/authorize', '/confirm-email']) {
      const source = new Response('<html>app</html>', { headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': 'login=synthetic; Secure; HttpOnly' } });
      let seen;
      globalThis.fetch = async request => { seen = request; return source; };
      const request = new Request('https://nolto.social'+path, { headers: { cookie: 'login=synthetic' } });
      const response = await gateway.fetch(request, { SUPABASE_ORIGIN: backend });
      assert.equal(seen, request);
      assert.equal(response.body, source.body);
      assert.equal(response.headers.get('set-cookie'), 'login=synthetic; Secure; HttpOnly');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      const policy = response.headers.get('content-security-policy');
      const nonce = policy.match(/'nonce-([A-Za-z0-9+/]{22}==)'/)[1];
      assert.equal(Buffer.from(nonce, 'base64').length, 16);
      assert.equal(policy, websitePolicy(backend, 'nolto.social', nonce));
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.match(websitePolicy(backend), /frame-ancestors 'none'/);
      assert.match(websitePolicy(backend), /object-src 'none'/);
      assert.match(websitePolicy(backend), /connect-src 'self' wss:\/\/nolto\.social /);
      assert.match(websitePolicy(backend, 'community.social'), /wss:\/\/community\.social/);
      assert.doesNotMatch(websitePolicy(backend, 'bad; script-src *'), /bad;|script-src \*/);
      assert.doesNotMatch(websitePolicy(backend).split(';').find(s => s.trim().startsWith('script-src')), /unsafe-inline|unsafe-eval/);
    }
  } finally { globalThis.fetch = original; }
});

test('the CSP allows the exact theme bootstrap from App, without allowing other inline scripts', () => {
  const html = renderToStaticMarkup(React.createElement(ThemeProvider, { attribute: 'class', defaultTheme: 'system', enableSystem: true, disableTransitionOnChange: true }));
  const script = html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1];
  const hash = createHash('sha256').update(script).digest('base64');
  assert.ok(websitePolicy(backend).includes(`'sha256-${hash}'`));
  assert.doesNotMatch(websitePolicy('https://bad.example/path; script-src *'), /bad.example|script-src \*/);
});

test('HTML nonces vary per response, preserve upstream policies and never authorize arbitrary inline scripts', async () => {
  const original = globalThis.fetch;
  const body = '<html><script>untrusted()</script><p>unchanged</p></html>';
  globalThis.fetch = async () => new Response(body, { headers: {
    'content-type': 'text/html', 'content-security-policy': "form-action 'self'",
    'cache-control': 'public, max-age=3600', 'etag': '"origin-v1"',
    'last-modified': 'Sun, 27 Sep 2026 12:00:00 GMT',
  } });
  try {
    const nonces = new Set();
    for (let i = 0; i < 8; i++) {
      const response = await gateway.fetch(new Request('https://nolto.social/'), { SUPABASE_ORIGIN: backend });
      const policy = response.headers.get('content-security-policy');
      assert.ok(policy.startsWith("form-action 'self', "));
      const nonce = policy.match(/'nonce-([A-Za-z0-9+/]{22}==)'/)[1];
      nonces.add(nonce);
      assert.doesNotMatch(policy.split(';').find(s => s.includes('script-src')), /unsafe-inline|unsafe-eval/);
      assert.equal(response.headers.get('cdn-cache-control'), 'no-store');
      assert.equal(response.headers.get('cloudflare-cdn-cache-control'), 'no-store');
      assert.equal(response.headers.get('etag'), null);
      assert.equal(response.headers.get('last-modified'), null);
      assert.equal(await response.text(), body);
    }
    assert.equal(nonces.size, 8);
    const asset = new Response('export default 1', { headers: { 'content-type': 'application/javascript', 'cache-control': 'public, max-age=31536000, immutable', 'etag': '"asset"' } });
    globalThis.fetch = async () => asset;
    assert.equal(await gateway.fetch(new Request('https://nolto.social/assets/app.js'), { SUPABASE_ORIGIN: backend }), asset);
    assert.equal(asset.headers.get('content-security-policy'), null);
    assert.equal(asset.headers.get('etag'), '"asset"');
    for (const invalid of ['', 'fixed-nonce', "'; script-src *", 'A'.repeat(22)+'==\r\nx-test: yes']) {
      assert.throws(() => websitePolicy(backend, 'nolto.social', invalid), /Invalid CSP nonce/);
    }
  } finally { globalThis.fetch = original; }
});

test('realtime proxy strips cookies, preserves authorization and upstream rejection; fails closed outside its endpoint', async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response('Invalid API key', { status: 401, headers: { 'set-cookie': '__cf_bm=synthetic; Domain=supabase.co', 'x-upstream': 'kept' } });
  };
  try {
    const headers = { upgrade: 'websocket', origin: 'https://nolto.social', cookie: 'private=synthetic', authorization: 'Bearer synthetic', 'sec-websocket-protocol': 'test-protocol', 'x-forwarded-host': 'forged.example' };
    const response = await gateway.fetch(new Request('https://nolto.social/realtime/v1/websocket?apikey=bad&vsn=1.0.0', { headers }), { SUPABASE_ORIGIN: backend });
    assert.equal(calls[0].url, backend+'/realtime/v1/websocket?apikey=bad&vsn=1.0.0');
    assert.equal(calls[0].init.headers.get('cookie'), null);
    assert.equal(calls[0].init.headers.get('x-forwarded-host'), null);
    assert.equal(calls[0].init.headers.get('authorization'), 'Bearer synthetic');
    assert.equal(calls[0].init.headers.get('sec-websocket-protocol'), 'test-protocol');
    assert.equal(calls[0].init.redirect, 'manual');
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('set-cookie'), null);
    assert.equal(response.headers.get('x-upstream'), 'kept');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(await response.text(), 'Invalid API key');
    for (const [path, options, status] of [
      ['/realtime/v1/websocket', {}, 426],
      ['/realtime/v1/websocket', { method: 'POST', headers }, 405],
      ['/realtime/v1/websocket', { headers: { ...headers, origin: 'https://evil.example' } }, 403],
      ['/realtime/v1/other', { headers }, 404],
    ]) assert.equal((await gateway.fetch(new Request('https://nolto.social'+path, options), { SUPABASE_ORIGIN: backend })).status, status);
    assert.equal(calls.length, 1);
  } finally { globalThis.fetch = original; }
});
