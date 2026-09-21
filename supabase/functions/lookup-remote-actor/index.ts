import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { postHandler, requestBody, requireUser, HttpError } from "../_shared/user-auth.ts";
import { remoteUrl, remoteFetch, readJson, fetchActorDocument } from "../_shared/remote-fetch.ts";

Deno.serve(postHandler(async req => {
  await requireUser(req);
  const { resource } = await requestBody(req, 2048);
  if (typeof resource !== "string" || resource.length > 320) throw new HttpError(400, "Invalid account address");
  const match = resource.replace(/^acct:/, "").replace(/^@/, "").match(/^([^@\s/:?#]+)@([^@\s/:?#]+)$/);
  if (!match) throw new HttpError(400, "Use username@server");
  const [, username, host] = match;
  const domain = remoteUrl(`https://${host.toLowerCase()}`).hostname;
  const acct = `${username}@${domain}`;
  const webfinger = await readJson(await remoteFetch(`https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${acct}`)}`, {
    headers: { Accept: "application/jrd+json" },
  }), 64 * 1024);
  if (webfinger.subject !== `acct:${acct}`) throw new HttpError(422, "WebFinger identity mismatch");
  const actorUrl = webfinger.links?.find((link: { rel?: string; type?: string; href?: string }) =>
    link.rel === "self" && ["application/activity+json", 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"'].includes(link.type || ""))?.href;
  if (typeof actorUrl !== "string") throw new HttpError(404, "No ActivityPub account found");
  const actor = await fetchActorDocument(actorUrl);
  const { error } = await serviceClient().from("remote_actors_cache").upsert({
    actor_url: actorUrl, actor_data: actor, fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  }, { onConflict: "actor_url" });
  if (error) throw error;
  return jsonResponse({ success: true, actorUrl, inbox: actor.inbox, cached: false });
}));
