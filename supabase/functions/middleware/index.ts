import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
Deno.serve(req => req.method === "OPTIONS" ? new Response(null, { headers: federationHeaders }) :
  jsonResponse({ error: "This legacy endpoint is no longer available." }, 410));
