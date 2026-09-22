import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
// Native Auth recovery owns token verification, expiry and rate limiting.
Deno.serve(req => req.method === "OPTIONS" ? new Response(null, { headers: federationHeaders }) :
  jsonResponse({ error: "This recovery endpoint has been retired. Request a new link at /auth/recovery." }, 410));
