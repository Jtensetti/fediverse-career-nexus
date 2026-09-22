import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
Deno.serve(req => req.method === "OPTIONS" ? new Response(null, { headers: federationHeaders }) :
  jsonResponse({ error: "Legacy migration endpoint retired. Message migrations require an operator-controlled job and a verified backup." }, 410));
