import { userHandler } from "../_shared/user-auth.ts";
import { serviceClient, federationHeaders, jsonResponse } from "../_shared/local-actor.ts";
import { buildActorUrl, buildActivityId } from "../_shared/federation-urls.ts";
import { fetchActorDocument } from "../_shared/remote-fetch.ts";
Deno.serve(userHandler(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...federationHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Sign in first" }, 401);
  const db = serviceClient();
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: "Invalid session" }, 401);
  try {
    const { new_account_url } = await req.json();
    const { data: actor, error } = await db.from("actors").select("id, preferred_username, moved_to")
      .eq("user_id", user.id).eq("is_remote", false).eq("status", "active").single();
    if (error) throw error;
    const actorUrl = buildActorUrl(actor.preferred_username);
    if (new_account_url === actorUrl) return jsonResponse({ error: "Choose a different account" }, 400);
    const target = await fetchActorDocument(new_account_url);
    if (!Array.isArray(target.alsoKnownAs) || !target.alsoKnownAs.includes(actorUrl)) return jsonResponse({ error: "Add your Nolto actor URL as an alias on the destination account first." }, 409);
    const activity = { "@context": "https://www.w3.org/ns/activitystreams", id: buildActivityId(), type: "Move", actor: actorUrl,
      object: actorUrl, target: target.id, to: ["https://www.w3.org/ns/activitystreams#Public"] };
    const { error: moveError } = await db.rpc("begin_actor_move", { actor_uuid: actor.id, target_url: target.id, move_activity: activity });
    if (moveError) throw moveError;
    return jsonResponse({ success: true, queued: true, movedTo: target.id }, 202);
  } catch (error) { console.error("Account move failed", error); return jsonResponse({ error: "Could not start the move. Check the destination and alias." }, 409); }
}));
