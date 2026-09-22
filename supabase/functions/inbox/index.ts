import { remoteFetch, fetchActorDocument, readBody } from "../_shared/remote-fetch.ts";
import { linkRemoteReply, localObjectId, resolveKnownObject } from '../_shared/federated-interactions.ts';

import { createClient } from "npm:@supabase/supabase-js@2.89.0";
import { functionPath, isLocalUrl, buildActorUrl, buildActivityId } from "../_shared/federation-urls.ts";
import { verifySignature, fetchPublicKey } from "../_shared/http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Check if a domain is blocked
async function isDomainBlocked(url: string): Promise<boolean> {
  try {
    const host = new URL(url).hostname;
    const { data, error } = await supabaseClient
      .from('blocked_domains')
      .select('status')
      .eq('host', host)
      .single();
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking blocked domain:', error);
      return false;
    }
    return data?.status === 'blocked';
  } catch (e) {
    console.error('Error parsing URL for domain check:', e);
    return false;
  }
}

// Check if an actor is blocked
async function isActorBlocked(actorUrl: string): Promise<boolean> {
  const { data, error } = await supabaseClient
    .from('blocked_actors')
    .select('status')
    .eq('actor_url', actorUrl)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking blocked actor:', error);
    return false;
  }

  return data?.status === 'blocked';
}

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);


// Rate limit configuration
const RATE_LIMIT_MAX_REQUESTS = 100; // Max requests per minute per host
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

// Check rate limiting for a host
async function checkRateLimit(remoteHost: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count } = await supabaseClient
    .from("federation_request_logs")
    .select("id", { count: "exact", head: true })
    .eq("remote_host", remoteHost)
    .gte("timestamp", windowStart);

  return (count || 0) < RATE_LIMIT_MAX_REQUESTS;
}

// Log federation request (fire-and-forget: never blocks the inbox response).
function logFederationRequest(remoteHost: string, endpoint: string, requestPath: string) {
  const insertPromise = supabaseClient
    .from("federation_request_logs")
    .insert({
      remote_host: remoteHost,
      endpoint,
      request_path: requestPath,
      request_id: crypto.randomUUID(),
    })
    .then(({ error }) => {
      if (error) console.error("Failed to log federation request:", error);
    });

  const runtime = (globalThis as any).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    runtime.waitUntil(insertPromise);
  } else {
    void insertPromise;
  }
}


Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = functionPath(url, "inbox");
    if (!pathParts) return new Response(null, { status: 404 });

    // Extract remote host for rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const remoteHost = forwardedFor?.split(",")[0].trim() ||
                       req.headers.get("x-real-ip") ||
                       "unknown";

    // Check rate limit before processing
    const withinLimit = await checkRateLimit(remoteHost);
    if (!withinLimit) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": "60"
          }
        }
      );
    }

    // Log the request
    await logFederationRequest(remoteHost, "inbox", url.pathname);

    // Routing:
    //   /functions/v1/inbox            -> sharedInbox (no specific recipient)
    //   /functions/v1/inbox/<username> -> per-actor inbox
    // pathParts here are everything after the function root, so 0 = sharedInbox, 1 = per-actor.
    let recipientActorId: string | null = null;
    let isSharedInbox = false;

    if (pathParts.length === 0) {
      isSharedInbox = true;
    } else if (pathParts.length === 1) {
      const username = pathParts[0];
      const { data: profile } = await supabaseClient
        .from("public_profiles")
        .select("id, username")
        .eq("username", username)
        .single();
      if (!profile) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: actor } = await supabaseClient
        .from("actors")
        .select("id, user_id")
        .eq("user_id", profile.id).eq("is_remote", false).eq("status", "active")
        .single();
      if (!actor) {
        return new Response(
          JSON.stringify({ error: "Actor not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      recipientActorId = actor.id;
    } else {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read body and verify signature
    let bodyText: string;
    try {
      if (Number(req.headers.get("content-length")) > 1024 * 1024) return new Response(null, { status: 413 });
      bodyText = await readBody(req);
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Invalid body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (new TextEncoder().encode(bodyText).length > 1024 * 1024) {
      return new Response(null, { status: 413, headers: corsHeaders });
    }
    let activity;
    try { activity = JSON.parse(bodyText); } catch { return new Response(null, { status: 400 }); }
    if (typeof activity?.id !== "string" || typeof activity?.actor !== "string" || typeof activity?.type !== "string") {
      return new Response(JSON.stringify({ error: "Activity id, type and actor are required" }), { status: 400, headers: corsHeaders });
    }
    // Ownership is exact, not merely a matching hostname (two users share one host).
    const verified = await verifySignature(req, bodyText, keyId => fetchPublicKey(keyId, activity.actor));
    if (!verified) return new Response(JSON.stringify({ error: "Invalid signature or actor ownership" }), { status: 401, headers: corsHeaders });

    if (isLocalUrl(activity.actor)) return new Response(null, { status: 403 });
    const { data: received, error: receiptError } = await supabaseClient.from("federation_receipts").select("activity_id").eq("activity_id", activity.id).maybeSingle();
    if (receiptError) throw receiptError;
    if (received) return new Response(null, { status: 202 });

    // For sharedInbox: resolve recipient(s) from to/cc and fan-out to first matching local actor.
    // (Mastodon delivers per-recipient; for our purposes we accept-and-process once.)
    if (isSharedInbox) {
      const audience: string[] = [
        ...(activity.type === "Follow" && typeof activity.object === "string" ? [activity.object] : []),
        ...(["Accept", "Reject"].includes(activity.type) && typeof activity.object?.actor === "string" ? [activity.object.actor] : []),
        ...(Array.isArray(activity.to) ? activity.to : activity.to ? [activity.to] : []),
        ...(Array.isArray(activity.cc) ? activity.cc : activity.cc ? [activity.cc] : []),
      ];
      // Try to find any local actor in the audience
      for (const aud of audience) {
        const m = typeof aud === "string" && isLocalUrl(aud) ? aud.match(/\/functions\/v1\/actor\/([^/?#]+)/) : null;
        if (m) {
          const { data: a } = await supabaseClient
            .from("actors")
            .select("id")
            .eq("preferred_username", m[1])
            .eq("is_remote", false)
            .maybeSingle();
          if (a) { recipientActorId = a.id; break; }
        }
      }
      if (!recipientActorId && ["Accept", "Reject"].includes(activity.type)) {
        const followId = typeof activity.object === "string" ? activity.object : activity.object?.id;
        const { data: pending, error } = await supabaseClient.from("outgoing_follows").select("local_actor_id")
          .eq("remote_actor_url", activity.actor).eq("follow_activity_id", followId || "").maybeSingle();
        if (error) throw error;
        recipientActorId = pending?.local_actor_id || null;
      }
      // Public posts are normally addressed to the sender's followers collection.
      if (!recipientActorId) {
        const { data: follower } = await supabaseClient.from("outgoing_follows")
          .select("local_actor_id").eq("remote_actor_url", activity.actor).eq("status", "accepted").limit(1).maybeSingle();
        recipientActorId = follower?.local_actor_id || null;
      }
      if (!recipientActorId) {
        return new Response(JSON.stringify({ success: true, note: "no local recipient" }), {
          status: 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (["Create", "Update"].includes(activity.type) && ["Note", "Article", "Question"].includes(activity.object?.type)) {
      const object = activity.object;
      const audience = [activity.to, activity.cc, object.to, object.cc].flatMap(v => Array.isArray(v) ? v : v ? [v] : []);
      if (!audience.includes("https://www.w3.org/ns/activitystreams#Public")) {
        return new Response(JSON.stringify({ error: "Private and followers-only federation posts are not supported" }), { status: 422, headers: corsHeaders });
      }
      if (typeof object.id !== "string" || object.attributedTo !== activity.actor || new URL(object.id).origin !== new URL(activity.actor).origin) {
        return new Response(JSON.stringify({ error: "Object ownership does not match the sender" }), { status: 403, headers: corsHeaders });
      }
    }

    // Persist raw activity for auditing
    await supabaseClient.from('activities').insert({
      actor_id: recipientActorId,
      type: activity.type,
      payload: activity
    });

    // Moderation checks
    if (await isDomainBlocked(activity.actor)) {
      return new Response(
        JSON.stringify({ error: "Domain blocked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (await isActorBlocked(activity.actor)) {
      return new Response(
        JSON.stringify({ error: "Actor blocked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the activity based on its type
    const sender = activity.actor;
    const actorIdForHandlers = recipientActorId!;

    switch (activity.type) {
      case "Follow":
        await handleFollowActivity(activity, actorIdForHandlers, sender);
        break;
      case "Accept":
        await handleAcceptActivity(activity, actorIdForHandlers, sender);
        break;
      case "Reject":
        await handleRejectActivity(activity, actorIdForHandlers, sender);
        break;
      case "Undo":
        await handleUndoActivity(activity, actorIdForHandlers, sender);
        break;
      case "Create":
        await handleCreateActivity(activity, actorIdForHandlers, sender);
        break;
      case "Like":
        await handleLikeActivity(activity, actorIdForHandlers, sender);
        break;
      case "Announce":
        await handleAnnounceActivity(activity, actorIdForHandlers, sender);
        break;
      case "Delete":
        await handleDeleteActivity(activity, actorIdForHandlers, sender);
        break;
      case "Update":
        await handleUpdateActivity(activity, actorIdForHandlers, sender);
        break;
      case "Move":
        await handleMoveActivity(activity, actorIdForHandlers, sender);
        break;
      case "Flag":
        await handleFlagActivity(activity, actorIdForHandlers, sender);
        break;
      case "Block":
        await handleBlockActivity(activity, actorIdForHandlers, sender);
        break;
      default:
        // Store unsupported activities for future reference
        await supabaseClient
          .from("inbox_items")
          .insert({
            recipient_id: actorIdForHandlers,
            sender: sender,
            activity_type: activity.type,
            content: activity
          });
    }

    const { error: saveReceiptError } = await supabaseClient.from("federation_receipts").upsert({ activity_id: activity.id, actor_url: sender });
    if (saveReceiptError) throw saveReceiptError;

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing inbox request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function handleFollowActivity(activity: any, recipientId: string, sender: string) {
  try {

    const followerActorUrl = activity.actor;
    if (!followerActorUrl) {
      throw new Error("Follow activity missing actor field");
    }

    // Look up local actor — including manually_approves_followers preference
    const { data: localActor, error: localActorError } = await supabaseClient
      .from("actors")
      .select("preferred_username, manually_approves_followers")
      .eq("id", recipientId)
      .single();

    if (localActorError || !localActor) {
      throw new Error(`Local actor not found: ${localActorError?.message}`);
    }

    if (activity.object !== buildActorUrl(localActor.preferred_username)) throw new Error("Follow target mismatch");
    const remoteActor = await fetchActorDocument(sender);
    const { error: cacheError } = await supabaseClient.from("remote_actors_cache").upsert({
      actor_url: sender, actor_data: remoteActor, fetched_at: new Date().toISOString(),
    });
    if (cacheError) throw cacheError;
    const requiresApproval = localActor.manually_approves_followers === true;
    const followStatus = requiresApproval ? "pending" : "accepted";

    // Store the follow relationship
    const { data: followData, error: followError } = await supabaseClient
      .from("actor_followers")
      .upsert({
        local_actor_id: recipientId,
        follower_actor_url: followerActorUrl,
        follow_activity_id: activity.id,
        status: followStatus
      }, { onConflict: "local_actor_id,follower_actor_url" })
      .select()
      .single();

    if (followError) {
      if (followError.code === '23505') { // unique constraint violation
        // A previous Accept delivery may have failed; queue it again below.
      }
      else throw followError;
    }

    // Only auto-Accept if not requiring manual approval. Otherwise wait for owner action.
    if (requiresApproval) {
      // Notify the local user about the pending follow request
      const { data: actorWithUser } = await supabaseClient
        .from("actors")
        .select("user_id")
        .eq("id", recipientId)
        .single();
      if (actorWithUser?.user_id) {
        await supabaseClient.from("notifications").insert({
          type: "follow_request",
          recipient_id: actorWithUser.user_id,
          actor_id: null,
          object_id: followerActorUrl,
          object_type: "actor",
          content: `${followerActorUrl} requests to follow you`,
          read: false
        });
      }
      return;
    }

    // Build canonical Accept activity (nolto.social URLs)
    const acceptActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Accept",
      "id": buildActivityId(),
      "actor": buildActorUrl(localActor.preferred_username),
      "to": followerActorUrl,
      "object": activity,
      "published": new Date().toISOString()
    };


    // Queue the Accept activity using the partitioned federation queue
    const { data: partitionKey, error: partitionError } = await supabaseClient
      .rpc("actor_id_to_partition_key", { actor_uuid: recipientId });

    if (partitionError || partitionKey === null) {
      console.error("Error determining partition:", partitionError);
      throw partitionError;
    }

    const { error: queueError } = await supabaseClient
      .from("federation_queue_partitioned")
      .insert({
        activity: acceptActivity,
        actor_id: recipientId,
        status: "pending",
        partition_key: partitionKey
      });

    if (queueError) {
      console.error("Error queuing Accept activity:", queueError);
      throw queueError;
    }

  } catch (error) {
    console.error("Error handling Follow activity:", error);
    throw error;
  }
}

async function settleFollow(activity: any, recipientId: string, sender: string, status: string) {
  const object = activity.object;
  const followId = typeof object === "string" ? object : object?.id;
  if (!followId) throw new Error("Missing Follow id");
  const { error } = await supabaseClient.from("outgoing_follows").update({ status })
    .eq("local_actor_id", recipientId).eq("remote_actor_url", sender).eq("follow_activity_id", followId);
  if (error) throw error;
}
async function handleAcceptActivity(activity: any, recipientId: string, sender: string) {
  await settleFollow(activity, recipientId, sender, "accepted");
}
async function handleRejectActivity(activity: any, recipientId: string, sender: string) {
  await settleFollow(activity, recipientId, sender, "rejected");
}

async function handleUndoActivity(activity: any, recipientId: string, sender: string) {
  try {

    // Check if the object is a Follow activity
    if (typeof activity.object !== 'string' && activity.object?.actor !== sender) throw new Error("Undo actor mismatch");
    if (activity.object?.type === "Follow") {
      await handleUnfollowActivity(activity.object, recipientId, sender);
    } else {
      const id = typeof activity.object === 'string' ? activity.object : activity.object?.id;
      if (typeof id !== 'string') throw new Error('Undo activity has no identifier');
      const actorId = await resolveRemoteActorId(sender);
      if (!actorId) throw new Error('Remote actor unavailable');
      const { error } = await supabaseClient.rpc('undo_remote_interaction', { p_activity_id: id, p_actor_id: actorId });
      if (error) throw error;
    }
  } catch (error) {
    console.error("Error handling Undo activity:", error);
    throw error;
  }
}

async function handleUnfollowActivity(activity: any, recipientId: string, sender: string) {
  try {

    const followerActorUrl = activity.actor;
    if (!followerActorUrl) {
      throw new Error("Follow activity missing actor field");
    }

    const targetActorUrl = activity.object;
    if (!targetActorUrl) {
      throw new Error("Follow activity missing object field");
    }

    const { data: localActor, error: localActorError } = await supabaseClient
      .from("actors")
      .select("preferred_username")
      .eq("id", recipientId)
      .single();

    if (localActorError || !localActor) {
      throw new Error(`Local actor not found: ${localActorError?.message}`);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const expectedActorUrl = buildActorUrl(localActor.preferred_username);

    if (targetActorUrl !== expectedActorUrl) {
      return;
    }

    // Remove the follow relationship
    const { data, error } = await supabaseClient
      .from("actor_followers")
      .delete()
      .eq("local_actor_id", recipientId)
      .eq("follower_actor_url", followerActorUrl)
      .select();

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error("Error handling Unfollow activity:", error);
    throw error;
  }
}

async function handleCreateActivity(activity: any, recipientId: string, sender: string) {
  try {

    // Extract the created object
    const object = activity.object;
    if (!object) {
      throw new Error("Create activity missing object");
    }

    // Store the object in the inbox_items table for auditing
    const { data: inboxData, error: inboxError } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: activity.type,
        object_type: object.type,
        content: activity
      })
      .select()
      .single();

    if (inboxError) {
      throw inboxError;
    }


    // Also store in ap_objects so it appears in the federated feed!
    // Only store Note/Article type objects
    if (['Note','Article','Question'].includes(object.type)) {
      // Get or create a remote actor entry for the sender
      let remoteActorId: string | null = null;

      // First check if we have this actor cached
      const { data: cachedActor } = await supabaseClient
        .from("remote_actors_cache")
        .select("actor_url")
        .eq("actor_url", sender)
        .single();

      // Check if we have a local actor entry for this remote sender
      const { data: existingActor } = await supabaseClient
        .from("actors")
        .select("id")
        .eq("remote_actor_url", sender)
        .single();

      if (existingActor) {
        remoteActorId = existingActor.id;
      } else {
        // Create a placeholder actor for the remote sender
        const actorUsername = sender.split('/').pop() || 'remote_user';
        const { data: newActor, error: actorError } = await supabaseClient
          .from("actors")
          .insert({
            preferred_username: `remote_${actorUsername}_${Date.now()}`,
            type: "Person",
            is_remote: true,
            remote_actor_url: sender,
            remote_inbox_url: (await fetchActorDocument(sender)).inbox
          })
          .select()
          .single();

        if (!actorError && newActor) {
          remoteActorId = newActor.id;
        }
      }

      if (!remoteActorId) throw new Error('Remote actor unavailable');

      // Store the Note/Article in ap_objects with remote source
      const { data: apObject, error: apError } = await supabaseClient
        .from("ap_objects")
        .upsert({
          remote_object_id: object.id,
          type: object.type,
          content: object, // Store just the object, not the full activity
          attributed_to: remoteActorId,
          published_at: object.published || activity.published || new Date().toISOString(),
          content_warning: object.summary || null
        }, { onConflict: "remote_object_id", ignoreDuplicates: true })
        .select()
        .single();

      if (apError) {
        console.error("Error storing in ap_objects:", apError);
        if (apError.code !== "PGRST116") throw apError;
      }
      if (object.inReplyTo) {
        const saved = apObject || await resolveKnownObject(supabaseClient, object.id);
        if (saved) {
          if (saved.attributed_to !== remoteActorId) throw new Error('Object ownership mismatch');
          await linkRemoteReply(supabaseClient, saved.id, saved.content?.inReplyTo);
        }
      }

      // If we don't have the actor cached, try to fetch and cache it
      if (!cachedActor) {
        try {
          const actorRes = await remoteFetch(sender, {
            headers: { Accept: 'application/activity+json' }
          });
          if (actorRes.ok) {
            const actorData = await actorRes.json();
            await supabaseClient
              .from('remote_actors_cache')
              .upsert({
                actor_url: sender,
                actor_data: actorData,
                fetched_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
              });
          }
        } catch (fetchError) {
          console.warn(`Could not cache remote actor ${sender}:`, fetchError);
        }
      }
    }
  } catch (error) {
    console.error("Error handling Create activity:", error);
    throw error;
  }
}

// Resolve a remote actor URL to its local UUID, caching it as a remote actor row.
async function resolveRemoteActorId(actorUrl: string): Promise<string | null> {
  if (!actorUrl) return null;
  const { data: existing } = await supabaseClient
    .from("actors")
    .select("id")
    .eq("remote_actor_url", actorUrl)
    .maybeSingle();
  if (existing?.id) return existing.id;
  // Insert a stub remote actor record so future references work
  const { data: inserted, error } = await supabaseClient
    .from("actors")
    .insert({
      remote_actor_url: actorUrl,
      preferred_username: actorUrl.split("/").pop() || "unknown",
      type: "Person",
      is_remote: true,
      status: "active"
    })
    .select("id")
    .single();
  if (error) {
    console.warn("Failed to create remote actor stub:", error);
    return null;
  }
  return inserted.id;
}

async function handleLikeActivity(activity: any, recipientId: string, sender: string) {
  try {

    const objectUrl = typeof activity.object === 'string' ? activity.object : activity.object?.id;
    if (!objectUrl) {
      throw new Error("Like activity missing object reference");
    }

    // Store inbox audit row
    await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Like",
        object_type: "Note",
        content: activity
      });

    // Persist as a Like ap_object so reaction counts / UIs see the boost-like
    const remoteActorId = await resolveRemoteActorId(sender);
    if (remoteActorId) {
      const { error } = await supabaseClient.from("ap_objects").upsert({
        remote_object_id: activity.id,
        type: "Like",
        attributed_to: remoteActorId,
        content: activity
      }, { onConflict: "remote_object_id", ignoreDuplicates: true });
      if (error) throw error;
      const target = await resolveKnownObject(supabaseClient, objectUrl);
      if (target && !target.deleted_at && target.moderation_status === 'published') {
        const { error } = await supabaseClient.rpc('record_remote_like', { p_activity_id: activity.id, p_actor_id: remoteActorId, p_target_id: target.id });
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error("Error handling Like activity:", error);
    throw error;
  }
}

async function handleAnnounceActivity(activity: any, recipientId: string, sender: string) {
  try {

    const objectUrl = typeof activity.object === 'string' ? activity.object : activity.object?.id;
    if (!objectUrl) {
      throw new Error("Announce activity missing object reference");
    }

    await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Announce",
        object_type: "Note",
        content: activity
      });

    // Persist Announce as ap_object so boost counts (get_batch_boost_counts) include it
    const remoteActorId = await resolveRemoteActorId(sender);
    if (remoteActorId) {
      await supabaseClient.from("ap_objects").upsert({
        remote_object_id: activity.id,
        type: "Announce",
        attributed_to: remoteActorId,
        content: activity
      }, { onConflict: "remote_object_id", ignoreDuplicates: true });
    }

  } catch (error) {
    console.error("Error handling Announce activity:", error);
    throw error;
  }
}

async function handleDeleteActivity(activity: any, recipientId: string, sender: string) {
  try {

    const objectUrl = typeof activity.object === 'string' ? activity.object : activity.object?.id;
    if (!objectUrl) {
      throw new Error("Delete activity missing object reference");
    }

    // Check if this is a tombstone (deleted object)
    const objectType = typeof activity.object === 'object' ? activity.object.type : null;

    if (objectType === 'Tombstone') {
    }

    const remoteActorId = await resolveRemoteActorId(sender);
    if (remoteActorId) {
      const { error } = await supabaseClient.from("ap_objects")
        .update({ type: "Tombstone", content: { id: objectUrl, type: "Tombstone", deleted: new Date().toISOString() } })
        .eq("remote_object_id", objectUrl).eq("attributed_to", remoteActorId);
      if (error) throw error;
    }

    // Mark any inbox items from this sender referencing this object as deleted
    const { error: updateError } = await supabaseClient
      .from("inbox_items")
      .update({ processed_at: new Date().toISOString() })
      .eq("sender", sender)
      .contains("content", { object: { id: objectUrl } });

    if (updateError) {
      console.warn("Error marking inbox items as processed:", updateError);
    }

    // Store the delete activity for auditing
    const { data, error } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Delete",
        object_type: objectType || "Unknown",
        content: activity,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

  } catch (error) {
    console.error("Error handling Delete activity:", error);
    throw error;
  }
}

async function handleUpdateActivity(activity: any, recipientId: string, sender: string) {
  try {

    const object = activity.object;
    if (!object) {
      throw new Error("Update activity missing object");
    }

    const objectUrl = typeof object === 'string' ? object : object.id;
    const objectType = typeof object === 'object' ? object.type : null;

    // Audit trail
    await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Update",
        object_type: objectType,
        content: activity
      });


    // If this is an actor update, refresh the cache
    if (objectType === 'Person' || objectType === 'Service' || objectType === 'Application' || objectType === 'Organization' || objectType === 'Group') {
      if (object.id !== sender) throw new Error("Actor update ownership mismatch");
      await supabaseClient
        .from("remote_actors_cache")
        .upsert({
          actor_url: sender,
          actor_data: object,
          fetched_at: new Date().toISOString()
        });
    } else if (typeof object === 'object' && objectUrl) {
      // Object update (Note edited from Mastodon etc.) — sync into ap_objects so
      // federated feed sees the latest content.
      const remoteActorId = await resolveRemoteActorId(sender);
      if (remoteActorId) {
        const { error } = await supabaseClient.from("ap_objects")
          .update({ content: object }).eq("remote_object_id", objectUrl).eq("attributed_to", remoteActorId);
        if (error) throw error;
      }
    }
  } catch (error) {
    console.error("Error handling Update activity:", error);
    throw error;
  }
}

// Handle Move activity (account migration)
async function handleMoveActivity(activity: any, recipientId: string, sender: string) {
  try {

    const oldAccount = activity.object;
    const newAccount = activity.target;

    if (!oldAccount || !newAccount) {
      throw new Error("Move activity missing object or target");
    }

    // Verify that sender matches the object being moved
    const oldAccountUrl = typeof oldAccount === 'string' ? oldAccount : oldAccount.id;
    if (oldAccountUrl !== sender) {
      throw new Error("Move activity sender must match the account being moved");
    }

    // Store the Move activity
    const { data, error } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Move",
        object_type: "Person",
        content: activity
      })
      .select()
      .single();

    if (error) throw error;


    // Fetch new account to verify alsoKnownAs
    const newAccountUrl = typeof newAccount === 'string' ? newAccount : newAccount.id;

    try {
      const response = await remoteFetch(newAccountUrl, {
        headers: { "Accept": "application/activity+json" }
      });

      if (response.ok) {
        const newAccountData = await response.json();
        const alsoKnownAs = newAccountData.alsoKnownAs || [];

        // Verify the new account lists the old account in alsoKnownAs
        if (newAccountData.id !== newAccountUrl || !alsoKnownAs.includes(oldAccountUrl)) {
          return; // Don't process unverified moves
        }

        // Cache the new account data
        await supabaseClient
          .from("remote_actors_cache")
          .upsert({
            actor_url: newAccountUrl,
            actor_data: newAccountData,
            fetched_at: new Date().toISOString()
          });

        // Auto re-follow: every local actor that follows the OLD remote actor should
        // start following the NEW one. We queue Follow activities to the new account.
        const { data: oldRemoteActor } = await supabaseClient
          .from("actors")
          .select("id")
          .eq("remote_actor_url", oldAccountUrl)
          .maybeSingle();

        if (oldRemoteActor?.id) {
          const { data: localFollowers } = await supabaseClient
            .from("outgoing_follows")
            .select("local_actor_id")
            .eq("remote_actor_url", oldAccountUrl)
            .eq("status", "accepted");


          for (const lf of localFollowers || []) {
            const { data: la } = await supabaseClient
              .from("actors")
              .select("preferred_username")
              .eq("id", lf.local_actor_id)
              .single();
            if (!la?.preferred_username) continue;

            const followActivity = {
              "@context": "https://www.w3.org/ns/activitystreams",
              "type": "Follow",
              "id": buildActivityId(),
              "actor": buildActorUrl(la.preferred_username),
              "object": newAccountUrl,
              "to": [newAccountUrl]
            };

            const { data: pk } = await supabaseClient
              .rpc("actor_id_to_partition_key", { actor_uuid: lf.local_actor_id });

            // Persist the Follow ID before a fast remote Accept can arrive.
            const { error: followError } = await supabaseClient.from("outgoing_follows").upsert({
              local_actor_id: lf.local_actor_id,
              remote_actor_url: newAccountUrl,
              follow_activity_id: followActivity.id,
              status: "pending"
            }, { onConflict: "local_actor_id,remote_actor_url" });
            if (followError) throw followError;
            const { error: queueError } = await supabaseClient.from("federation_queue_partitioned").insert({
              actor_id: lf.local_actor_id, activity: followActivity, status: "pending",
              partition_key: pk ?? 0, priority: 5
            });
            if (queueError) throw queueError;
          }


          // Notify the local users about the migration
          const { data: usersToNotify } = await supabaseClient
            .from("actors")
            .select("user_id")
            .in("id", (localFollowers || []).map((f: any) => f.local_actor_id));

          for (const u of usersToNotify || []) {
            if (!u.user_id) continue;
            await supabaseClient.from("notifications").insert({
              type: "account_moved",
              recipient_id: u.user_id,
              actor_id: null,
              object_id: oldAccountUrl,
              object_type: "actor",
              content: `${oldAccountUrl} has moved to ${newAccountUrl} — we re-followed automatically`,
              read: false
            });
          }
        }

        // Mark old account as moved in cache
        const { data: oldCache } = await supabaseClient
          .from("remote_actors_cache")
          .select("actor_data")
          .eq("actor_url", oldAccountUrl)
          .maybeSingle();

        await supabaseClient
          .from("remote_actors_cache")
          .upsert({
            actor_url: oldAccountUrl,
            actor_data: { ...(oldCache?.actor_data || {}), movedTo: newAccountUrl },
            fetched_at: new Date().toISOString()
          });

      }
    } catch (fetchError) {
      console.error("Error fetching new account for Move verification:", fetchError);
      throw fetchError;
    }
  } catch (error) {
    console.error("Error handling Move activity:", error);
    throw error;
  }
}

// Handle incoming Flag (moderation report) from a remote instance
async function handleFlagActivity(activity: any, recipientId: string, sender: string) {
  try {

    // Audit trail
    await supabaseClient.from("inbox_items").insert({
      recipient_id: recipientId,
      sender,
      activity_type: "Flag",
      object_type: "Report",
      content: activity
    });

    // Extract reported objects (can be array or single)
    const objects = Array.isArray(activity.object) ? activity.object : [activity.object];
    const reason = typeof activity.content === "string" ? activity.content : "Federated report";

    for (const obj of objects) {
      const objUrl = typeof obj === "string" ? obj : obj?.id;
      if (!objUrl) continue;

      const localId = localObjectId(objUrl);

      await supabaseClient.from("content_reports").insert({
        content_id: localId || objUrl,
        content_type: localId ? "post" : "remote",
        reason: "federated_flag",
        details: `From ${sender}: ${reason}`,
        reporter_id: null as any,
        status: "pending"
      });
    }

  } catch (error) {
    console.error("Error handling Flag activity:", error);
    throw error;
  }
}

// Handle incoming Block — record so we don't deliver to the blocker
async function handleBlockActivity(activity: any, recipientId: string, sender: string) {
  try {

    const target = typeof activity.object === "string" ? activity.object : activity.object?.id;

    await supabaseClient.from("inbox_items").insert({
      recipient_id: recipientId,
      sender,
      activity_type: "Block",
      object_type: "Actor",
      content: activity
    });

    if (target) {
      // Remove the blocker from any local actor's follower list (they shouldn't receive our updates)
      await supabaseClient
        .from("actor_followers")
        .delete()
        .eq("follower_actor_url", sender).eq("follow_activity_id", activity.id);

      // Stop our outgoing follows toward the blocker
      await supabaseClient
        .from("outgoing_follows")
        .delete()
        .eq("remote_actor_url", sender);

    }
  } catch (error) {
    console.error("Error handling Block activity:", error);
    throw error;
  }
}
