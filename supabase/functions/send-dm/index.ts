import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
// Local Nolto messaging uses its own authenticated service. Remote private delivery is not implemented.
Deno.serve(req => req.method === "OPTIONS" ? new Response(null, { headers: federationHeaders }) :
  jsonResponse({ error: "Federated direct messages are not supported. No message was delivered." }, 422));
