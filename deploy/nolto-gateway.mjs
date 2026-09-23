/** Cloudflare gateway: a route over an existing origin, or a dedicated apex
 * with the website on www. These are separate deployment modes; see
 * docs/nolto-activation.md and the two Wrangler configuration files.
 */
function httpsOrigin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid origin');
  return url;
}
const unavailable = () => new Response('Invalid gateway configuration', { status: 503, headers: { 'Cache-Control': 'no-store' } });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const mode = env.GATEWAY_MODE || 'route';
    if (!['route', 'split'].includes(mode)) return unavailable();
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
      return fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
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
    return fetch(request);
  },
};
