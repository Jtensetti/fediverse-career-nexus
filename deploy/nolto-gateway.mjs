/** Cloudflare gateway: a route over an existing origin, or a dedicated apex
 * with the website on www. These are separate deployment modes; see
 * docs/nolto-activation.md and the two Wrangler configuration files.
 */
function httpsOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid origin');
  return url;
}
const dnsHostname = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const reservedTlds = new Set(['alt', 'arpa', 'example', 'internal', 'invalid', 'local', 'localhost', 'onion', 'test']);
function publicHostname(value) {
  return typeof value === 'string' && value === value.trim() && value.length <= 253 && dnsHostname.test(value) && !reservedTlds.has(value.split('.').at(-1));
}
function validDid(value) {
  // AT Protocol permits production did:web identities at a hostname only.
  // Do not normalize an operator's identifier or accept ports/path escapes.
  return typeof value === 'string' && value === value.trim() && (/^did:plc:[a-z2-7]{24}$/.test(value) ||
    (value.startsWith('did:web:') && publicHostname(value.slice(8))));
}
function identityResponse(request, body, status, extra = {}) {
  return new Response(request.method === 'HEAD' ? null : body, {
    status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}
const unavailable = () => new Response('Invalid gateway configuration', { status: 503, headers: { 'Cache-Control': 'no-store' } });
// Enforced on HTML from the existing website origin. Keep protocol responses
// and managed authentication cookies intact. The hash is next-themes 0.3.0's
// bootstrap with App.tsx's ThemeProvider props (covered by a regression test).
export function websitePolicy(backend, domain = 'nolto.social') {
  // Some browsers do not include WebSockets in connect-src 'self'.
  let connect = "'self'";
  if (publicHostname(domain)) connect += ` wss://${domain}`;
  try {
    const origin = httpsOrigin(backend);
    connect += ` ${origin.origin} ${origin.origin.replace('https:', 'wss:')}`;
  } catch { /* No arbitrary source strings can enter a response header. */ }
  return [
    "default-src 'self'",
    "script-src 'self' 'sha256-eMuh8xiwcX72rRYNAGENurQBAcH7kLlAUQcoOri3BIo=' https://static.cloudflareinsights.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "font-src 'self' data:",
    `connect-src ${connect} https://cloudflareinsights.com`,
    "media-src 'self' https: blob:",
    // Event hosts are selected by users (YouTube/Jitsi/meeting providers).
    "frame-src https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}
function hardenWebsite(upstream, env) {
  if (!/^text\/html(?:;|$)/i.test(upstream.headers.get('content-type') || '')) return upstream;
  const response = new Response(upstream.body, upstream);
  // Append instead of weakening any independent policy supplied by the origin.
  response.headers.append('Content-Security-Policy', websitePolicy(env.SUPABASE_ORIGIN, env.FEDERATION_DOMAIN));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}
async function realtimeResponse(request, env, url) {
  if (url.pathname !== '/realtime/v1/websocket') return identityResponse(request, 'Not found', 404);
  if (request.method !== 'GET') return identityResponse(request, 'Method not allowed', 405, { Allow: 'GET' });
  if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return identityResponse(request, 'WebSocket required', 426);
  // Browser subscriptions are same-origin. Non-browser callers may omit Origin;
  // upstream API keys/JWTs and subscription authorization still apply to both.
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return identityResponse(request, 'Forbidden origin', 403);
  let backend;
  try {
    backend = httpsOrigin(env.SUPABASE_ORIGIN);
    if (backend.origin === url.origin) throw new Error();
  } catch { return unavailable(); }
  const headers = new Headers(request.headers);
  for (const name of ['host', 'cookie', 'forwarded', 'x-forwarded-host', 'x-forwarded-for']) headers.delete(name);
  const upstream = await fetch(new URL(url.pathname + url.search, backend), { headers, redirect: 'manual' });
  // Copy the upgrade response without accepting the socket: Workers forwards it
  // transparently, retaining subprotocol, close and backpressure behavior.
  const response = new Response(upstream.body, upstream);
  response.headers.delete('set-cookie');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
// Paths only scanners probe. Never a real Nolto page or protocol route.
const HONEYPOT = /^\/(?:wp-login\.php|wp-admin(?:\/|$)|xmlrpc\.php|\.env(?:\.|$)|\.git(?:\/|$)|phpmyadmin(?:\/|$)|pma(?:\/|$)|admin\.php|config\.php|server-status|actuator(?:\/|$)|cgi-bin\/|vendor\/phpunit\/|nolto-trap-7f3a(?:\/|$))/i;
export const isHoneypotPath = (path) => HONEYPOT.test(path);
// Federation and client API routes always bypass IP blocks, so a shared
// address can never break delivery from other servers or native apps.
export const isFederationPath = (path) => path.startsWith('/.well-known/') || path.startsWith('/nodeinfo/') ||
  /^\/(?:api\/v[12]|oauth\/(?:token|revoke)|functions\/v1\/(?:actor|inbox|outbox|followers|following|objects|activities|nodeinfo))(?:\/|$)/.test(path);
const blockCache = new Map();
async function guardCall(env, action, ip, reason) {
  const backend = httpsOrigin(env.SUPABASE_ORIGIN);
  const response = await fetch(new URL('/functions/v1/ip-guard', backend.origin), {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-gateway-secret': env.GATEWAY_GUARD_SECRET },
    body: JSON.stringify({ action, ip, reason }),
  });
  if (!response.ok) throw new Error('guard unavailable');
  const { blockedUntil } = await response.json();
  return blockedUntil ? Date.parse(blockedUntil) : 0;
}
/** Returns a response when the request is trapped or blocked. Fails open:
 * a guard outage must never take the website down. */
export async function ipGuard(request, env, url, now = Date.now()) {
  const ip = request.headers.get('cf-connecting-ip');
  if (!env.GATEWAY_GUARD_SECRET || !ip || isFederationPath(url.pathname)) return null;
  const blocked = () => new Response('Access temporarily blocked', { status: 403, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
  if (isHoneypotPath(url.pathname)) {
    try { blockCache.set(ip, await guardCall(env, 'hit', ip, `honeypot ${url.pathname.slice(0, 60)}`)); } catch { /* fail open */ }
    return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  }
  let entry = blockCache.get(ip);
  if (entry === undefined || (typeof entry === 'object' && entry.checked < now - 60000)) {
    try { entry = { until: await guardCall(env, 'check', ip), checked: now }; } catch { return null; }
    if (blockCache.size > 5000) blockCache.clear();
    blockCache.set(ip, entry);
  }
  const until = typeof entry === 'number' ? entry : entry.until;
  return until > now ? blocked() : null;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const trapped = await ipGuard(request, env, url);
    if (trapped) return trapped;
    const mode = env.GATEWAY_MODE || 'route';
    if (!['route', 'split'].includes(mode)) return unavailable();
    const domain = env.FEDERATION_DOMAIN === undefined ? 'nolto.social' : env.FEDERATION_DOMAIN;
    if (!publicHostname(domain)) return unavailable();
    // A misconfigured extra route must never publish the apex identity on a
    // different host, or forward its requests to the federation backend.
    if (url.protocol !== 'https:' || url.port || url.hostname !== domain) return identityResponse(request, 'Not found', 404);
    if (url.pathname.startsWith('/.well-known/atproto-did')) {
      if (url.pathname !== '/.well-known/atproto-did') return identityResponse(request, 'Not found', 404);
      if (!['GET', 'HEAD'].includes(request.method)) return identityResponse(request, 'Method not allowed', 405, { Allow: 'GET, HEAD' });
      const did = env.ATPROTO_DID;
      if (did === undefined || did === '') return identityResponse(request, 'No AT Protocol identity configured', 404);
      if (!validDid(did)) return identityResponse(request, 'Invalid gateway configuration', 503);
      // This is public handle verification, not a PDS or an account bridge.
      return identityResponse(request, did, 200);
    }
    if (url.pathname.startsWith('/realtime/')) return realtimeResponse(request, env, url);
    const discovery = {
      "/.well-known/webfinger": "/functions/v1/webfinger",
      "/.well-known/nodeinfo": "/functions/v1/nodeinfo",
      "/.well-known/host-meta": "/functions/v1/host-meta",
      "/.well-known/oauth-authorization-server": "/functions/v1/oauth-authorization-server",
    };
    const path = discovery[url.pathname] ||
      (url.pathname.startsWith('/nodeinfo/') ? `/functions/v1${url.pathname}` : null) ||
      (/^\/api\/v[12](\/|$)/.test(url.pathname) ? '/functions/v1/mastodon-api'+url.pathname : null) ||
      (['/oauth/token','/oauth/revoke'].includes(url.pathname) ? '/functions/v1/oauth-authorization-server/'+url.pathname.split('/').at(-1) : null) ||
      (/^\/functions\/v1\/(actor|inbox|outbox|followers|following|objects|activities|nodeinfo)(\/|$)/.test(url.pathname) ? url.pathname : null);
    if (path) {
      let backend;
      try {
        backend = httpsOrigin(env.SUPABASE_ORIGIN);
        if (backend.origin === url.origin) throw new Error();
      } catch {
        return unavailable();
      }
      const target = new URL(path + url.search, backend.origin);
      const headers = new Headers(request.headers);
      headers.delete("host");
      // Prevent a user-supplied forwarded host from becoming a trusted signature input.
      headers.delete("x-forwarded-host");
      headers.delete("x-forwarded-for");
      headers.delete("forwarded");
      // Protocol endpoints authenticate with bearer tokens or HTTP signatures.
      // Browser cookies belong to Nolto's origin, not the Supabase upstream.
      headers.delete("cookie");
      const upstream = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
      // Keep the body streaming and preserve status/other headers. In particular,
      // never relay Supabase's __cf_bm cookie (Domain=supabase.co) from nolto.social.
      const response = new Response(upstream.body, upstream);
      response.headers.delete("set-cookie");
      return response;
    }
    if (mode === 'split') {
      let frontend;
      try {
        frontend = httpsOrigin(env.FRONTEND_ORIGIN);
        if (frontend.origin === url.origin || frontend.origin === new URL(env.SUPABASE_ORIGIN).origin) throw new Error();
      } catch { return unavailable(); }
      // A Custom Domain Worker IS the origin. fetch(request) here would call
      // the same origin again. The browser must instead use the website origin
      // for cookies, sessionStorage, managed social login and OAuth callbacks.
      if (!['GET', 'HEAD'].includes(request.method)) return new Response('Use the website origin', { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } });
      // Assign the pathname rather than resolve it: //evil.example in a path
      // must never turn an operator-controlled redirect into an open redirect.
      frontend.pathname = url.pathname;
      frontend.search = url.search;
      return new Response(null, { status: 302, headers: { Location: frontend.href, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
    }
    // A Worker Route forwards unmatched requests to the existing origin. Keep
    // the canonical browser origin for OAuth state, storage and callbacks.
    return hardenWebsite(await fetch(request), env);
  },
};
