/**
 * Cloudflare Worker for proxying ActivityPub federation requests from nolto.social
 * to Supabase Edge Functions.
 * 
 * This worker handles all federation-related endpoints that remote ActivityPub servers
 * will access when interacting with Nolto actors.
 */

// Paths that should be proxied to Supabase Edge Functions
const FEDERATION_PATHS = [
  // Well-known discovery endpoints
  "/.well-known/webfinger",
  "/.well-known/host-meta",
  "/.well-known/nodeinfo",
  // ActivityPub core endpoints (these are prefixed paths)
  "/functions/v1/actor",
  "/functions/v1/inbox",
  "/functions/v1/outbox",
  "/functions/v1/followers",
  "/functions/v1/following",
  "/functions/v1/nodeinfo",
  "/functions/v1/instance",
  "/functions/v1/activities",
];

export default {
  /**
   * The fetch handler is the entry point for the worker.
   * @param request The incoming request.
   * @param env An object containing environment variables and secrets.
   * @param ctx The execution context.
   * @returns A Response object.
   */
  async fetch(
    request: Request,
    env: { SUPABASE_URL: string },
  ): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if this path should be proxied
    const shouldProxy = FEDERATION_PATHS.some((path) => {
      // Exact match for well-known paths
      if (pathname === path) return true;
      // Prefix match for /functions/v1/* paths
      if (path.startsWith("/functions/v1/") && pathname.startsWith(path)) return true;
      return false;
    });

    if (!shouldProxy) {
      // If the path doesn't match, pass through to the origin (Lovable frontend)
      // This is critical for routes like /auth/callback which are handled by the SPA
      return fetch(request);
    }

    // Build the destination URL
    const supabaseUrl = env.SUPABASE_URL;
    if (!supabaseUrl) {
      console.error("SUPABASE_URL environment variable not configured");
      return new Response("Server misconfiguration", { status: 500 });
    }

    // Map well-known paths to their Edge Function equivalents
    let targetPath = pathname;
    if (pathname === "/.well-known/webfinger") {
      targetPath = "/functions/v1/webfinger";
    } else if (pathname === "/.well-known/host-meta") {
      targetPath = "/functions/v1/host-meta";
    } else if (pathname === "/.well-known/nodeinfo") {
      targetPath = "/functions/v1/nodeinfo";
    }

    const destinationUrl = new URL(targetPath, supabaseUrl);
    
    // Preserve the original query string
    destinationUrl.search = url.search;

    console.log(`Proxying ${request.method} ${pathname} to: ${destinationUrl.toString()}`);

    // Clone the request with the new destination, preserving method, headers, and body
    const headers = new Headers(request.headers);
    
    // Add forwarding headers for the Edge Function
    headers.set("X-Forwarded-Host", url.host);
    headers.set("X-Forwarded-Proto", "https");
    
    // Create the proxied request
    const proxyRequest = new Request(destinationUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      // @ts-ignore - duplex is needed for streaming bodies
      duplex: request.method !== "GET" && request.method !== "HEAD" ? "half" : undefined,
    });

    try {
      const response = await fetch(proxyRequest);
      
      // Create a new response with CORS headers if needed
      const responseHeaders = new Headers(response.headers);
      
      // Ensure ActivityPub content types are preserved
      const contentType = response.headers.get("Content-Type");
      if (contentType) {
        responseHeaders.set("Content-Type", contentType);
      }
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response("Bad Gateway", { status: 502 });
    }
  },
};
