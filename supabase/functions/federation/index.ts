import { collectPages } from "../_shared/export-pagination.ts";
import { deliverInboxes } from "../_shared/delivery.ts";
import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { signedFetch } from "../_shared/http-signature.ts";
import { fetchActorDocument } from "../_shared/remote-fetch.ts";
import { buildActorUrl, buildFollowersUrl, getFederationBaseUrl, isLocalUrl } from "../_shared/federation-urls.ts";
import { CONTEXT, PUBLIC, localObject } from "../_shared/local-content.ts";

type QueueOrder = { created_at: string; id: string };

Deno.serve(async (req) => {
  // This is a worker, not a user API. A valid ordinary user JWT is insufficient.
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) return jsonResponse({ error: "Worker credentials required" }, 401);
  const db = serviceClient();
  try {
    const { partition, limit = 10 } = await req.json().catch(() => ({}));
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) return jsonResponse({ error: "Invalid limit" }, 400);
    let partitions: number[];
    if (partition !== undefined) {
      if (!Number.isInteger(partition) || partition < 0 || partition > 15) return jsonResponse({ error: "Invalid partition" }, 400);
      partitions = [partition];
    } else {
      partitions = Array.from({ length: 16 }, (_, index) => index);
    }
    const results = [];
    for (const partitionKey of partitions) {
      const { data: items, error } = await db.rpc("claim_federation_items", { p_partition: partitionKey, p_limit: limit });
      if (error) throw error;
      for (const item of (items || []).sort((a: QueueOrder, b: QueueOrder) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))) {
        let failure: string | null = null;
        try {
          const { data: actor, error: actorError } = await db.from("actors").select("preferred_username, status, is_remote, user_id").eq("id", item.actor_id).single();
          if (actorError) throw actorError;
          let activity = item.activity;
          const actorDeletion = activity.type === 'Delete' && activity.delete_actor === true;
          const { data: profile, error: profileError } = await db.from('profiles').select('deleted_at').eq('id', actor.user_id).maybeSingle();
          if (profileError) throw profileError;
          if (actor.is_remote || !profile || (actorDeletion ? !profile.deleted_at : actor.status !== 'active' || !!profile.deleted_at)) {
            throw new Error('Local federation is unavailable');
          }
          if (actorDeletion) {
            activity = { '@context': CONTEXT, type: 'Delete',
              id: `${buildActorUrl(actor.preferred_username)}#delete-${activity.activity_id}`,
              actor: buildActorUrl(actor.preferred_username), object: { id: buildActorUrl(actor.preferred_username), type: 'Tombstone' },
              to: [PUBLIC], cc: [buildFollowersUrl(actor.preferred_username)] };
          } else if (activity.needs_enrichment && ['Create', 'Update'].includes(activity.type)) {
            const { data: current, error } = await db.from('ap_objects').select('id,deleted_at,moderation_status').eq('id', activity.object_id).maybeSingle();
            if (error) throw error;
            if (!current || current.deleted_at || current.moderation_status !== 'published') throw new Error('Content is not published');
          }
          if (activity.needs_enrichment) {
            if (!activity.snapshot) throw new Error("Legacy queue item has no snapshot; reconcile before retrying");
            const object = localObject(activity.snapshot, actor.preferred_username);
            const kind = activity.type;
            activity = { "@context": CONTEXT, type: kind,
              id: `${getFederationBaseUrl()}/functions/v1/activities/${kind === "Create" ? activity.object_id : activity.activity_id}`,
              actor: buildActorUrl(actor.preferred_username), to: object.to, cc: object.cc,
              object: kind === "Delete" ? { id: object.id, type: "Tombstone", formerType: object.type } : object };
          }
          if (activity.actor !== buildActorUrl(actor.preferred_username)) throw new Error("Queue actor does not own activity");
          const audience = [activity.to, activity.cc].flat().filter((x: unknown): x is string => typeof x === "string");
          const recipients = new Set<string>(audience.filter((x: string) => x !== PUBLIC && !isLocalUrl(x)));
          if (["Create", "Update", "Delete", "Announce", "Undo", "Move"].includes(activity.type) &&
              (audience.includes(PUBLIC) || audience.includes(buildFollowersUrl(actor.preferred_username)))) {
            const followers = await collectPages<{ follower_actor_url: string }>((from, to) =>
              db.from('actor_followers').select('follower_actor_url', { count: 'exact' })
                .eq('local_actor_id', item.actor_id).eq('status', 'accepted').order('follower_actor_url').range(from, to));
            for (const follower of followers || []) recipients.add(follower.follower_actor_url);
          }
          if (activity.type === "Accept" && activity.object?.actor) recipients.add(activity.object.actor);
          const inboxes = new Set<string>();
          const resolutionFailures: string[] = [];
          const addresses = [...recipients];
          for (let offset = 0; offset < addresses.length; offset += 50) {
            const batch = addresses.slice(offset, offset + 50);
            const { data: cache, error } = await db.from("remote_actors_cache").select("actor_url, actor_data, fetched_at").in("actor_url", batch);
            if (error) throw error;
            const { data: blockedActors, error: actorBlockError } = await db.from("blocked_actors").select("actor_url").in("actor_url", batch).eq("status", "blocked");
            const { data: blockedDomains, error: domainBlockError } = await db.from("blocked_domains").select("host").eq("status", "blocked");
            if (actorBlockError || domainBlockError) throw actorBlockError || domainBlockError;
            const blockedActorUrls = new Set((blockedActors || []).map(row => row.actor_url));
            const blockedHosts = new Set((blockedDomains || []).map(row => row.host));
            const known = new Map((cache || []).map(row => [row.actor_url, row]));
            for (const recipient of batch) {
              try {
                if (blockedActorUrls.has(recipient) || blockedHosts.has(new URL(recipient).hostname)) continue;
                const cached = known.get(recipient);
                const remote = cached?.actor_data?.id === recipient && Date.parse(cached.fetched_at) > Date.now() - 86400000
                  ? cached.actor_data : await fetchActorDocument(recipient);
                const inbox = remote.endpoints?.sharedInbox || remote.inbox;
                if (!blockedHosts.has(new URL(inbox).hostname)) inboxes.add(inbox);
              } catch { resolutionFailures.push("Recipient resolution failed"); }
            }
          }
          const { data: receipts, error: receiptsError } = await db.from("federation_deliveries").select("inbox").eq("queue_id", item.id);
          if (receiptsError) throw receiptsError;
          const failures = await deliverInboxes(inboxes, new Set((receipts || []).map(row => row.inbox)),
            async inbox => {
              const { data: stillQueued, error } = await db.from('federation_queue_partitioned').select('id').eq('id', item.id).maybeSingle();
              if (error) throw error;
              if (!stillQueued) throw new Error('Delivery cancelled');
              return signedFetch(inbox, { method: 'POST', body: JSON.stringify(activity) }, item.actor_id);
            },
            async inbox => {
              const { error } = await db.from("federation_deliveries").upsert({ queue_id: item.id, inbox });
              if (error) throw error;
            });
          const allFailures = [...resolutionFailures, ...failures];
          if (allFailures.length) throw new Error(allFailures.slice(0, 3).join("; "));

        } catch (error) { failure = "Delivery failed; retry or inspect aggregate worker health"; }
        const attempts = (item.attempts || 0) + 1;
        const { error: updateError } = await db.from("federation_queue_partitioned").update(failure ? {
          status: attempts >= (item.max_attempts || 10) ? "failed" : "retry", attempts,
          last_error: failure, next_retry_at: new Date(Date.now() + 60000 * 2 ** Math.min(attempts - 1, 9)).toISOString(),
        } : { status: "processed", attempts, last_error: null, processed_at: new Date().toISOString() })
          .eq("id", item.id).eq("partition_key", item.partition_key);
        if (updateError) throw updateError;
        results.push({ id: item.id, success: !failure, ...(failure ? { error: failure } : {}) });
      }
    }
    return jsonResponse({ results, processed: results.length });
  } catch (error) { console.error("Federation worker failed"); return jsonResponse({ error: "Queue processing failed" }, 500); }
});
