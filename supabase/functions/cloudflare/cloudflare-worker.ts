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
    env: { SUPABASE_FUNCTION_URL: string },
  ): Promise<Response> {
    const url = new URL(request.url);

    // We want requests to this specific path.
    const WEBGER_PATH = "/.well-known/webfinger";

    if (url.pathname === WEBGER_PATH) {
      // The destination URL is stored as a secret.
      const destinationUrl = new URL(env.SUPABASE_FUNCTION_URL);

      // Preserve the original query string.
      destinationUrl.search = url.search;

      console.log(`Proxying request to: ${destinationUrl.toString()}`);

      // Fetch the Supabase function and return its response directly to the client.
      return fetch(destinationUrl.toString());
    }

    // If the path doesn't match, this worker shouldn't handle it.
    return new Response("Path Not Found", { status: 404 });
  },
};
