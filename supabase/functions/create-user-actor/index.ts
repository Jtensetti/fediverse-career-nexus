import { generateRsaKeyPair } from "../_shared/http-signature.ts";
import { buildActorUrl } from "../_shared/federation-urls.ts";
import { serviceClient, jsonResponse, federationHeaders } from "../_shared/local-actor.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...federationHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Sign in to enable federation" }, 401);
  const db = serviceClient();
  const { data: { user }, error } = await db.auth.getUser(token);
  if (error || !user) return jsonResponse({ error: "Invalid session" }, 401);
  if (!user.email_confirmed_at) return jsonResponse({ error: "Confirm your account first" }, 403);
  try {
    const { enableFederation = false } = await req.json();
    if (typeof enableFederation !== "boolean") return jsonResponse({ error: "Invalid federation preference" }, 400);
    const keys = enableFederation ? await generateRsaKeyPair() : { privateKey: "", publicKey: "" };
    const { data: actorId, error: provisionError } = await db.rpc("ensure_local_actor", {
      user_uuid: user.id, enable_federation: enableFederation, new_private_key: keys.privateKey, new_public_key: keys.publicKey,
    });
    if (provisionError) throw provisionError;
    const { data: actor, error: readError } = await db.from("actors").select("preferred_username").eq("id", actorId).single();
    if (readError) throw readError;
    return jsonResponse({ actorId, actorUrl: buildActorUrl(actor.preferred_username), success: true });
  } catch (error) {
    console.error("Actor provisioning failed", error);
    return jsonResponse({ error: "Could not enable federation. Check your username and account status." }, 409);
  }
});
