import { userHandler } from "../_shared/user-auth.ts";
import { serviceClient, jsonResponse, federationHeaders } from "../_shared/local-actor.ts";
import { buildActorUrl, buildActivityId } from "../_shared/federation-urls.ts";
import { fetchActorDocument, remoteFetch, readJson, remoteUrl } from "../_shared/remote-fetch.ts";
import { signedFetch } from "../_shared/http-signature.ts";

async function resolveAccount(acct: string): Promise<string> {
  const match = /^@?([^@\s]+)@([^@\s/]+)$/.exec(acct.trim());
  if (!match) throw new Error("Use username@server for an account address");
  const domain = remoteUrl(`https://${match[2]}`).hostname;
  const url = new URL(`https://${domain}/.well-known/webfinger`);
  url.searchParams.set("resource", `acct:${match[1]}@${domain}`);
  const document = await readJson(await remoteFetch(url.toString(), { headers: { Accept: "application/jrd+json" } }));
  const link = document.links?.find((link: { rel?: string; type?: string }) =>
    link.rel === "self" && (link.type === "application/activity+json" || link.type?.startsWith("application/ld+json")));
  if (typeof link?.href !== "string") throw new Error("No ActivityPub actor found");
  return remoteUrl(link.href).href;
}

Deno.serve(userHandler(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...federationHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return jsonResponse({ error: "Sign in first" }, 401);
  const db = serviceClient();
  const { data: { user }, error: authError } = await db.auth.getUser(token);
  if (authError || !user) return jsonResponse({ error: "Invalid session" }, 401);
  try {
    const { localActorId, remoteActorUrl: requestedUrl, acct, action = "follow" } = await req.json();
    if (!["follow", "unfollow"].includes(action)) return jsonResponse({ error: "Invalid action" }, 400);
    const { data: actor, error } = await db.from("actors").select("id, preferred_username, moved_to")
      .eq("id", localActorId).eq("user_id", user.id).eq("is_remote", false).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (!actor || actor.moved_to) return jsonResponse({ error: "You do not own an active local actor" }, 403);
    const remoteActorUrl = typeof requestedUrl === "string" ? requestedUrl : typeof acct === "string" ? await resolveAccount(acct) : null;
    if (!remoteActorUrl) return jsonResponse({ error: "An account address or actor URL is required" }, 400);
    if (remoteActorUrl === buildActorUrl(actor.preferred_username)) return jsonResponse({ error: "You cannot follow yourself" }, 400);
    const target = remoteUrl(remoteActorUrl);
    const { data: domainBlock, error: domainBlockError } = await db.from("blocked_domains").select("status").eq("host", target.hostname).maybeSingle();
    const { data: actorBlock, error: actorBlockError } = await db.from("blocked_actors").select("status").eq("actor_url", remoteActorUrl).maybeSingle();
    if (domainBlockError || actorBlockError) throw domainBlockError || actorBlockError;
    if (action === "follow" && (domainBlock?.status === "blocked" || actorBlock?.status === "blocked")) return jsonResponse({ error: "This account is blocked by the instance" }, 403);
    const remoteActor = await fetchActorDocument(remoteActorUrl);
    const { data: existing, error: lookupError } = await db.from("outgoing_follows")
      .select("id, status, follow_activity_id").eq("local_actor_id", actor.id).eq("remote_actor_url", remoteActorUrl).maybeSingle();
    if (lookupError) throw lookupError;
    if (action === "follow" && existing?.status === "accepted") return jsonResponse({ success: true, action, delivered: true });
    if (action === "unfollow" && !existing) return jsonResponse({ success: true, action, delivered: true });
    const actorUrl = buildActorUrl(actor.preferred_username);
    const followId = existing?.follow_activity_id || buildActivityId();
    const follow = { id: followId, type: "Follow", actor: actorUrl, object: remoteActorUrl };
    const activity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      ...(action === "unfollow" ? { id: buildActivityId(), type: "Undo", actor: actorUrl, object: follow } : follow),
      to: [remoteActorUrl],
    };
    if (action === "follow") {
      // Save before delivering: Mastodon may send Accept before the POST returns.
      const { error: saveError } = await db.from("outgoing_follows").upsert({
        local_actor_id: actor.id, remote_actor_url: remoteActorUrl,
        follow_activity_id: followId, status: "pending", updated_at: new Date().toISOString(),
      }, { onConflict: "local_actor_id,remote_actor_url" });
      if (saveError) throw saveError;
    }
    const response = await signedFetch(remoteActor.inbox, { method: "POST", body: JSON.stringify(activity) }, actor.id);
    if (!response.ok) return jsonResponse({ error: "The remote server did not accept the request. You can retry.", status: response.status }, 502);
    if (action === "unfollow" && existing) {
      const { error } = await db.from("outgoing_follows").delete().eq("id", existing.id);
      if (error) throw error;
    }
    await db.from("remote_actors_cache").upsert({ actor_url: remoteActorUrl, actor_data: remoteActor, fetched_at: new Date().toISOString() });
    return jsonResponse({ success: true, action, activityId: activity.id, delivered: true }, 202);
  } catch (error) {
    console.error("Follow request failed", error);
    return jsonResponse({ error: "Could not send the follow request. Check the account address and retry." }, 502);
  }
}));
