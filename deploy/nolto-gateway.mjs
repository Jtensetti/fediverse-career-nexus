/** Cloudflare Worker for nolto.social when the web UI lives on a separate origin.
 * Set SUPABASE_ORIGIN and SITE_ORIGIN in Worker environment variables.
 * Install on nolto.social/* ahead of any redirect rule. See docs/production-readiness.md.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const backend = new URL(env.SUPABASE_ORIGIN);
    const site = new URL(env.SITE_ORIGIN);
    if (backend.protocol !== "https:" || site.protocol !== "https:" || site.origin === url.origin) {
      return new Response("Invalid gateway configuration", { status: 503 });
    }
    const discovery = {
      "/.well-known/webfinger": "/functions/v1/webfinger",
      "/.well-known/nodeinfo": "/functions/v1/nodeinfo",
      "/.well-known/host-meta": "/functions/v1/host-meta",
    };
    const path = discovery[url.pathname] ||
      (/^\/functions\/v1\/(actor|inbox|outbox|followers|following|objects|activities|nodeinfo)(\/|$)/.test(url.pathname) ? url.pathname : null);
    if (path) {
      const target = new URL(path + url.search, backend.origin);
      const headers = new Headers(request.headers);
      headers.delete("host");
      // Prevent a user-supplied forwarded host from becoming a trusted signature input.
      headers.delete("x-forwarded-host");
      return fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
    }
    return Response.redirect(new URL(url.pathname + url.search, site.origin), 302);
  },
};
