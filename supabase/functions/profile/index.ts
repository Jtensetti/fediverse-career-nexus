import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
Deno.serve(req => req.method === "OPTIONS" ? new Response(null, { headers: federationHeaders }) :
  jsonResponse({ error: "This legacy API is unavailable. Nolto does not implement the Mastodon client API." }, 410));
