import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const gateway = readFileSync(new URL('./nolto-gateway.mjs', import.meta.url),'utf8').replace('export default {','const gateway = {');
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, compatibilityDate:'2026-09-23', script: gateway + `
export default { async fetch(request) {
  if (new URL(request.url).pathname === '/html') {
    globalThis.fetch = async () => new Response('<html><script>untrusted()</script></html>', { headers: {
      'content-type':'text/html', 'set-cookie':'login=synthetic; Secure; HttpOnly',
      'cache-control':'public, max-age=3600', 'etag':'"fixture"',
    } });
    return gateway.fetch(new Request('https://nolto.social/'), {SUPABASE_ORIGIN:'https://backend.example.com'});
  }
  globalThis.fetch = async () => {
    const pair = new WebSocketPair();
    pair[1].accept();
    pair[1].addEventListener('message', event => pair[1].send(event.data));
    return new Response(null, { status:101, webSocket: pair[0], headers:{'set-cookie':'__cf_bm=synthetic; Domain=supabase.co'} });
  };
  return gateway.fetch(new Request('https://nolto.social/realtime/v1/websocket', request), {SUPABASE_ORIGIN:'https://backend.example.com'});
}};` }));
try {
  const nonces = new Set();
  for (let i = 0; i < 2; i++) {
    const html = await mf.dispatchFetch('http://localhost/html');
    const policy = html.headers.get('content-security-policy');
    nonces.add(policy.match(/'nonce-([A-Za-z0-9+/]{22}==)'/)[1]);
    assert.doesNotMatch(policy.split(';').find(s => s.includes('script-src')), /unsafe-inline|unsafe-eval/);
    assert.equal(html.headers.get('cache-control'), 'private, no-store');
    assert.equal(html.headers.get('etag'), null);
    assert.equal(html.headers.get('set-cookie'), 'login=synthetic; Secure; HttpOnly');
    assert.equal(await html.text(), '<html><script>untrusted()</script></html>');
  }
  assert.equal(nonces.size, 2);
  console.log('PASS: actual Workers runtime generates fresh CSP nonces without authorizing arbitrary scripts or caching HTML');
  const response = await mf.dispatchFetch('http://localhost/realtime/v1/websocket', {headers:{Upgrade:'websocket',Origin:'https://nolto.social'}});
  assert.equal(response.status,101);
  assert.equal(response.headers.get('set-cookie'),null);
  assert.ok(response.webSocket);
  response.webSocket.accept();
  const received = new Promise((resolve,reject) => {
    const timer=setTimeout(()=>reject(Error('Echo timeout')),5000);
    response.webSocket.addEventListener('message',e=>{clearTimeout(timer);resolve(e.data);},{once:true});
  });
  response.webSocket.send('subscription-and-heartbeat-fixture');
  assert.equal(await received,'subscription-and-heartbeat-fixture');
  response.webSocket.close(1000);
  console.log('PASS: actual Workers runtime preserves 101 socket, bidirectional frames and removes upstream cookies');
} finally { await mf.dispose(); }
