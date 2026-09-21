import { federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
Deno.serve(req => req.method === "OPTIONS" ? new Response(null, { headers: federationHeaders }) :
  jsonResponse({ error: "Nolto sign-in does not request access to your private Mastodon home timeline. The Nolto feed uses public ActivityPub content." }, 410));
