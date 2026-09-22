import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { postHandler, requestBody, requireUser, HttpError } from "../_shared/user-auth.ts";
import { collectPages } from "../_shared/export-pagination.ts";
import { buildActorUrl } from "../_shared/federation-urls.ts";
import { fetchActorDocument } from "../_shared/remote-fetch.ts";
import { signedFetch } from "../_shared/http-signature.ts";

Deno.serve(postHandler(async req => {
  const { user, client, token } = await requireUser(req);
  const { confirmation } = await requestBody(req, 1024);
  if (confirmation !== "RADERA") throw new HttpError(400, "Explicit account deletion confirmation required");
  // This payload is read only after getUser has verified its signature and the live session.
  const encoded = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(atob(encoded));
  const recent = Array.isArray(claims.amr) && claims.amr.some((entry: { method?: string; timestamp?: number }) =>
    ["password", "oauth", "otp", "totp", "webauthn"].includes(entry.method || "") &&
    typeof entry.timestamp === "number" && entry.timestamp > Date.now() / 1000 - 900 && entry.timestamp <= Date.now() / 1000 + 30);
  if (!recent) throw new HttpError(403, "recent_login_required");
  const { error: preflightError } = await client.rpc("check_account_deletion");
  if (preflightError) throw new HttpError(409, "Överlåt organisationer och deras uppladdade filer innan du raderar kontot. Kontakta support om du behöver hjälp.");
  const admin = serviceClient();
  const { data: actors, error: actorError } = await admin.from("actors")
    .select("id,preferred_username,status,is_remote").eq("user_id", user.id);
  if (actorError) throw actorError;
  const deliveries: { actorId: string; username: string; recipient: string }[] = [];
  for (const actor of actors || []) {
    if (actor.is_remote || actor.status !== "active") continue;
    const followers = await collectPages((from, to) => admin.from("actor_followers")
      .select("id,follower_actor_url", { count: "exact" }).eq("local_actor_id", actor.id)
      .eq("status", "accepted").order("id").range(from, to));
    for (const follower of followers) deliveries.push({ actorId: actor.id, username: actor.preferred_username, recipient: follower.follower_actor_url });
  }
  // Large accounts need a background deletion job; do not begin a partial timed-out deletion.
  if (deliveries.length > 50) throw new HttpError(409, "Kontakta jtensetti@protonmail.com för att radera ett konto med fler än 50 federerade följare.");
  const files = await collectPages<{ id: string; bucket_id: string; name: string }>((from, to) => client.rpc("list_own_storage_objects", {}, { count: "exact" }).order("id").range(from, to));
  for (const bucket of new Set(files.map(file => file.bucket_id))) {
    const names = files.filter(file => file.bucket_id === bucket).map(file => file.name);
    for (let start = 0; start < names.length; start += 100) {
      const { error } = await admin.storage.from(bucket).remove(names.slice(start, start + 100));
      if (error) throw error;
    }
  }
  let remoteFailures = 0;
  for (let offset = 0; offset < deliveries.length; offset += 10) {
    const results = await Promise.allSettled(deliveries.slice(offset, offset + 10).map(async delivery => {
      const remote = await fetchActorDocument(delivery.recipient);
      const actor = buildActorUrl(delivery.username);
      const response = await signedFetch(remote.inbox, {
        method: "POST", headers: { "Content-Type": "application/activity+json" },
        body: JSON.stringify({ "@context": "https://www.w3.org/ns/activitystreams", id: `${actor}#delete`,
          type: "Delete", actor, object: actor, to: ["https://www.w3.org/ns/activitystreams#Public"] }),
      }, delivery.actorId);
      await response.body?.cancel();
      if (!response.ok) throw new Error("Remote deletion was not accepted");
    }));
    remoteFailures += results.filter(result => result.status === "rejected").length;
  }
  // The database deletion trigger handles records without foreign keys in this transaction.
  // In particular, no detached post content survives as a misleading Tombstone row.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) throw deleteError;
  return jsonResponse({ success: true, remote_deletion_failures: remoteFailures });
}));
