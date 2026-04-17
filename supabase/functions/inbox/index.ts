
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  signRequest,
  ensureActorHasKeys,
  signedFetch,
  fetchPublicKey,
  verifyRequestSignature,
} from "../_shared/http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fetch a public key for a given keyId
async function getPublicKey(keyId: string): Promise<string | null> {
  const actorUrl = keyId.split('#')[0];


  // Try cache first
  const { data: cached, error } = await supabaseClient
    .from('remote_actors_cache')
    .select('actor_data')
    .eq('actor_url', actorUrl)
    .single();

  if (!error && cached?.actor_data?.publicKey?.publicKeyPem) {
    return cached.actor_data.publicKey.publicKeyPem as string;
  }

  // Fallback to fetch actor profile
  try {
    const res = await fetch(actorUrl, {
      headers: { Accept: 'application/activity+json' }
    });
    if (!res.ok) return null;
    const actorData = await res.json();

    await supabaseClient
      .from('remote_actors_cache')
      .upsert({
        actor_url: actorUrl,
        actor_data: actorData,
        fetched_at: new Date().toISOString()
      });

    return actorData.publicKey?.publicKeyPem || null;
  } catch (_e) {
    return null;
  }
}

// Signature verification is provided by `_shared/http-signature.ts` (verifyRequestSignature).
// Inbox callers pass the local getPublicKey resolver via opts.

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

// Log federation request
async function logFederationRequest(remoteHost: string, endpoint: string, requestPath: string) {
  await supabaseClient
    .from("federation_request_logs")
    .insert({
      remote_host: remoteHost,
      endpoint,
      request_path: requestPath,
      request_id: crypto.randomUUID()
    });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Extract remote host for rate limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const remoteHost = forwardedFor?.split(",")[0].trim() || 
                       req.headers.get("x-real-ip") || 
                       "unknown";
    
    // Check rate limit before processing
    const withinLimit = await checkRateLimit(remoteHost);
    if (!withinLimit) {
      console.log(`Rate limit exceeded for host: ${remoteHost}`);
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
        .eq("user_id", profile.id)
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
      bodyText = await req.text();
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Invalid body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sigResult = await verifyRequestSignature(req, bodyText, { getPublicKey });
    if (!sigResult) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the activity
    let activity;
    try {
      activity = JSON.parse(bodyText);
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate the activity
    if (!activity.type || !activity.actor) {
      return new Response(
        JSON.stringify({ error: "Invalid activity" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: keyId host must match actor host (prevent cross-instance forgery)
    try {
      const actorHost = new URL(activity.actor).hostname;
      if (actorHost !== sigResult.keyIdHost) {
        console.error(`keyId/actor host mismatch: keyId=${sigResult.keyIdHost} actor=${actorHost}`);
        return new Response(
          JSON.stringify({ error: "keyId/actor host mismatch" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid actor URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For sharedInbox: resolve recipient(s) from to/cc and fan-out to first matching local actor.
    // (Mastodon delivers per-recipient; for our purposes we accept-and-process once.)
    if (isSharedInbox) {
      const audience: string[] = [
        ...(Array.isArray(activity.to) ? activity.to : activity.to ? [activity.to] : []),
        ...(Array.isArray(activity.cc) ? activity.cc : activity.cc ? [activity.cc] : []),
      ];
      // Try to find any local actor in the audience
      for (const aud of audience) {
        const m = aud.match(/\/functions\/v1\/actor\/([^/?#]+)/);
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
      // If no specific recipient resolved, persist as a generic inbox item against
      // a synthetic null — but our schema requires a recipient_id. Fall back to dropping.
      if (!recipientActorId) {
        console.log("sharedInbox activity with no resolvable local recipient, dropping");
        return new Response(JSON.stringify({ success: true, note: "no local recipient" }), {
          status: 202,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
      console.log(`Inbound activity from blocked domain: ${activity.actor}`);
      return new Response(
        JSON.stringify({ error: "Domain blocked" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (await isActorBlocked(activity.actor)) {
      console.log(`Inbound activity from blocked actor: ${activity.actor}`);
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
        console.log(`Unsupported activity type: ${activity.type}`);
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
    console.log(`Processing Follow activity from ${sender} to recipient ${recipientId}`);
    
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
    
    const requiresApproval = localActor.manually_approves_followers === true;
    const followStatus = requiresApproval ? "pending" : "accepted";
    
    // Store the follow relationship
    const { data: followData, error: followError } = await supabaseClient
      .from("actor_followers")
      .insert({
        local_actor_id: recipientId,
        follower_actor_url: followerActorUrl,
        status: followStatus
      })
      .select()
      .single();
    
    if (followError) {
      if (followError.code === '23505') { // unique constraint violation
        console.log(`Follow relationship already exists between ${followerActorUrl} and ${recipientId}`);
        return;
      }
      throw followError;
    }
    
    console.log(`Created follow relationship: ${followData.id} (status=${followStatus})`);
    
    // Only auto-Accept if not requiring manual approval. Otherwise wait for owner action.
    if (requiresApproval) {
      console.log(`Follow request pending manual approval for ${recipientId}`);
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
    
    // Update follower count
    await supabaseClient
      .from("actors")
      .update({ 
        follower_count: supabaseClient.raw('follower_count + 1') 
      })
      .eq("id", recipientId);
    
    // Build canonical Accept activity (samverkan.se URLs)
    const { buildActorUrl, buildActivityId } = await import("../_shared/federation-urls.ts");
    const acceptActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Accept",
      "id": buildActivityId(),
      "actor": buildActorUrl(localActor.preferred_username),
      "to": followerActorUrl,
      "object": activity,
      "published": new Date().toISOString()
    };
    
    console.log(`Created Accept activity targeting ${followerActorUrl}`);
    
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
    
    console.log(`Queued Accept activity for delivery to ${followerActorUrl}`);
  } catch (error) {
    console.error("Error handling Follow activity:", error);
    throw error;
  }
}

async function handleAcceptActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Accept activity from ${sender} to recipient ${recipientId}`);
    
    // Check if the object is a Follow activity
    if (activity.object?.type === "Follow") {
      const followActivityId = activity.object.id;
      const followActor = activity.object.actor;
      
      console.log(`Accept activity for Follow ${followActivityId} from ${followActor}`);
      
      // Find the corresponding outgoing follow request
      const { data: outgoingFollow, error: findError } = await supabaseClient
        .from("outgoing_follows")
        .select("*")
        .eq("local_actor_id", recipientId)
        .eq("remote_actor_uri", sender)
        .single();
      
      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }
      
      if (!outgoingFollow) {
        // Try to find by follow activity ID as fallback
        const { data: outgoingFollowById, error: findByIdError } = await supabaseClient
          .from("outgoing_follows")
          .select("*")
          .eq("follow_activity_id", followActivityId)
          .single();
        
        if (findByIdError && findByIdError.code !== 'PGRST116') {
          throw findByIdError;
        }
        
        if (!outgoingFollowById) {
          console.log(`No matching outgoing follow request found for Accept from ${sender}`);
          return;
        }
        
        // Update the follow request status to accepted
        const { error: updateError } = await supabaseClient
          .from("outgoing_follows")
          .update({ status: "accepted" })
          .eq("id", outgoingFollowById.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Updated outgoing follow ${outgoingFollowById.id} to accepted`);
      } else {
        // Update the follow request status to accepted
        const { error: updateError } = await supabaseClient
          .from("outgoing_follows")
          .update({ status: "accepted" })
          .eq("id", outgoingFollow.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Updated outgoing follow ${outgoingFollow.id} to accepted`);
      }
    } else {
      console.log(`Unsupported Accept object type: ${activity.object?.type}`);
    }
  } catch (error) {
    console.error("Error handling Accept activity:", error);
    throw error;
  }
}

async function handleRejectActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Reject activity from ${sender} to recipient ${recipientId}`);
    
    // Check if the object is a Follow activity
    if (activity.object?.type === "Follow") {
      const followActivityId = activity.object.id;
      const followActor = activity.object.actor;
      
      console.log(`Reject activity for Follow ${followActivityId} from ${followActor}`);
      
      // Find the corresponding outgoing follow request
      const { data: outgoingFollow, error: findError } = await supabaseClient
        .from("outgoing_follows")
        .select("*")
        .eq("local_actor_id", recipientId)
        .eq("remote_actor_uri", sender)
        .single();
      
      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }
      
      if (!outgoingFollow) {
        // Try to find by follow activity ID as fallback
        const { data: outgoingFollowById, error: findByIdError } = await supabaseClient
          .from("outgoing_follows")
          .select("*")
          .eq("follow_activity_id", followActivityId)
          .single();
        
        if (findByIdError && findByIdError.code !== 'PGRST116') {
          throw findByIdError;
        }
        
        if (!outgoingFollowById) {
          console.log(`No matching outgoing follow request found for Reject from ${sender}`);
          return;
        }
        
        // Update the follow request status to rejected
        const { error: updateError } = await supabaseClient
          .from("outgoing_follows")
          .update({ status: "rejected" })
          .eq("id", outgoingFollowById.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Updated outgoing follow ${outgoingFollowById.id} to rejected`);
      } else {
        // Update the follow request status to rejected
        const { error: updateError } = await supabaseClient
          .from("outgoing_follows")
          .update({ status: "rejected" })
          .eq("id", outgoingFollow.id);
        
        if (updateError) {
          throw updateError;
        }
        
        console.log(`Updated outgoing follow ${outgoingFollow.id} to rejected`);
      }
    } else {
      console.log(`Unsupported Reject object type: ${activity.object?.type}`);
    }
  } catch (error) {
    console.error("Error handling Reject activity:", error);
    throw error;
  }
}

async function handleUndoActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Undo activity from ${sender}`);
    
    // Check if the object is a Follow activity
    if (activity.object?.type === "Follow") {
      await handleUnfollowActivity(activity.object, recipientId, sender);
    } else {
      console.log(`Unsupported Undo object type: ${activity.object?.type}`);
    }
  } catch (error) {
    console.error("Error handling Undo activity:", error);
    throw error;
  }
}

async function handleUnfollowActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Unfollow (via Undo) from ${sender}`);

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
    const expectedActorUrl = `${supabaseUrl}/functions/v1/actor/${localActor.preferred_username}`;

    if (targetActorUrl !== expectedActorUrl) {
      console.log(`Undo Follow not targeted at this actor: ${targetActorUrl}`);
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
    
    if (data && data.length > 0) {
      console.log(`Removed follow relationship for ${followerActorUrl}`);
      
      // Update follower count
      await supabaseClient
        .from("actors")
        .update({ 
          follower_count: supabaseClient.raw('follower_count - 1') 
        })
        .eq("id", recipientId);
    } else {
      console.log(`No follow relationship found for ${followerActorUrl}`);
    }
  } catch (error) {
    console.error("Error handling Unfollow activity:", error);
    throw error;
  }
}

async function handleCreateActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Create activity from ${sender}`);
    
    // Extract the created object
    const object = activity.object;
    if (!object) {
      throw new Error("Create activity missing object");
    }

    // Check if this is a Direct Message (private Note)
    const toArray = Array.isArray(activity.to) ? activity.to : (activity.to ? [activity.to] : []);
    const ccArray = Array.isArray(activity.cc) ? activity.cc : (activity.cc ? [activity.cc] : []);
    const allRecipients = [...toArray, ...ccArray];
    
    // A DM is a Note that is NOT addressed to public followers
    const isPublic = allRecipients.some(r => 
      r.includes('#Public') || 
      r.includes('/followers') ||
      r === 'https://www.w3.org/ns/activitystreams#Public' ||
      r === 'as:Public'
    );
    
    if (object.type === 'Note' && !isPublic && toArray.length > 0) {
      // This appears to be a Direct Message
      console.log(`Detected incoming DM from ${sender}`);
      await handleDirectMessageActivity(activity, recipientId, sender);
      return;
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
    
    console.log(`Stored inbox item: ${inboxData.id}`);
    
    // Also store in ap_objects so it appears in the federated feed!
    // Only store Note/Article type objects
    if (object.type === 'Note' || object.type === 'Article') {
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
            remote_inbox_url: `${sender}/inbox`
          })
          .select()
          .single();
        
        if (!actorError && newActor) {
          remoteActorId = newActor.id;
          console.log(`Created remote actor entry: ${remoteActorId}`);
        }
      }
      
      // Store the Note/Article in ap_objects with remote source
      const { data: apObject, error: apError } = await supabaseClient
        .from("ap_objects")
        .insert({
          type: object.type,
          content: object, // Store just the object, not the full activity
          attributed_to: remoteActorId,
          published_at: object.published || activity.published || new Date().toISOString(),
          content_warning: object.summary || null // ActivityPub uses summary for CW
        })
        .select()
        .single();
      
      if (apError) {
        console.error("Error storing in ap_objects:", apError);
        // Don't throw - we already stored in inbox_items
      } else {
        console.log(`Stored remote content in ap_objects: ${apObject.id}`);
      }
      
      // If we don't have the actor cached, try to fetch and cache it
      if (!cachedActor) {
        try {
          const actorRes = await fetch(sender, {
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
            console.log(`Cached remote actor: ${sender}`);
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

// Handle incoming Direct Messages from Fediverse
async function handleDirectMessageActivity(activity: any, recipientActorId: string, sender: string) {
  try {
    const object = activity.object;
    const messageContent = object.content || object.contentMap?.en || '';
    
    console.log(`Processing DM from ${sender} to actor ${recipientActorId}`);
    
    // Get the local user ID from the recipient actor
    const { data: localActor, error: actorError } = await supabaseClient
      .from("actors")
      .select("user_id")
      .eq("id", recipientActorId)
      .single();
    
    if (actorError || !localActor?.user_id) {
      console.error("Could not find local user for actor:", recipientActorId);
      throw new Error("Recipient user not found");
    }
    
    const recipientUserId = localActor.user_id;
    
    // Find or create the remote sender actor
    let senderUserId: string | null = null;
    
    // Check if we have an existing actor for this sender
    const { data: existingActor } = await supabaseClient
      .from("actors")
      .select("id, user_id")
      .eq("remote_actor_url", sender)
      .eq("is_remote", true)
      .single();
    
    if (existingActor) {
      senderUserId = existingActor.user_id;
    } else {
      // Create a placeholder actor for the remote sender
      const actorUsername = sender.split('/').pop() || 'remote_user';
      
      // First create a placeholder profile for the remote user
      const { data: newProfile, error: profileError } = await supabaseClient
        .from("profiles")
        .insert({
          id: crypto.randomUUID(),
          username: `fediverse_${actorUsername}_${Date.now()}`,
          auth_type: 'federated',
          home_instance: new URL(sender).hostname,
          remote_actor_url: sender
        })
        .select()
        .single();
      
      if (profileError) {
        console.error("Error creating remote profile:", profileError);
        throw profileError;
      }
      
      senderUserId = newProfile.id;
      
      // Create actor entry
      const { error: actorCreateError } = await supabaseClient
        .from("actors")
        .insert({
          preferred_username: actorUsername,
          type: "Person",
          is_remote: true,
          remote_actor_url: sender,
          remote_inbox_url: `${sender}/inbox`,
          user_id: senderUserId
        });
      
      if (actorCreateError) {
        console.error("Error creating remote actor:", actorCreateError);
      }
      
      // Try to fetch and cache actor data for display
      try {
        const actorRes = await fetch(sender, {
          headers: { Accept: 'application/activity+json' }
        });
        if (actorRes.ok) {
          const actorData = await actorRes.json();
          
          // Update profile with fetched data
          await supabaseClient
            .from("profiles")
            .update({
              fullname: actorData.name,
              avatar_url: actorData.icon?.url,
              bio: actorData.summary
            })
            .eq("id", senderUserId);
          
          // Cache actor data
          await supabaseClient
            .from('remote_actors_cache')
            .upsert({
              actor_url: sender,
              actor_data: actorData,
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            }, { onConflict: "actor_url" });
        }
      } catch (fetchError) {
        console.warn(`Could not fetch remote actor data for ${sender}:`, fetchError);
      }
    }
    
    if (!senderUserId) {
      throw new Error("Could not resolve sender user ID");
    }
    
    // Store the message in the messages table
    const { data: message, error: messageError } = await supabaseClient
      .from("messages")
      .insert({
        sender_id: senderUserId,
        recipient_id: recipientUserId,
        content: messageContent,
        is_federated: true,
        federated_activity_id: activity.id,
        remote_sender_url: sender,
        delivery_status: 'received'
      })
      .select()
      .single();
    
    if (messageError) {
      console.error("Error storing DM:", messageError);
      throw messageError;
    }
    
    console.log(`Stored federated DM: ${message.id}`);
    
    // Create notification for the recipient
    const { error: notifError } = await supabaseClient
      .from("notifications")
      .insert({
        type: 'direct_message',
        recipient_id: recipientUserId,
        actor_id: senderUserId,
        object_id: message.id,
        object_type: 'message',
        content: 'sent you a message',
        read: false
      });
    
    if (notifError) {
      console.error("Error creating DM notification:", notifError);
      // Don't throw - message was stored successfully
    }
    
    console.log(`Created notification for DM to user ${recipientUserId}`);
    
  } catch (error) {
    console.error("Error handling DM activity:", error);
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

// Try to extract our local ap_objects UUID from an object URL like
// https://samverkan.se/functions/v1/objects/<uuid> or any URL containing a UUID.
function extractLocalObjectId(objectUrl: string): string | null {
  if (!objectUrl) return null;
  const m = objectUrl.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return m ? m[0] : null;
}

async function handleLikeActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Like activity from ${sender}`);
    
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
      await supabaseClient.from("ap_objects").insert({
        type: "Like",
        attributed_to: remoteActorId,
        content: activity
      });
    }
    
    const localObjectId = extractLocalObjectId(objectUrl);
    if (localObjectId) {
      console.log(`Like targets local object ${localObjectId}`);
    }
    console.log(`Processed Like for ${objectUrl}`);
  } catch (error) {
    console.error("Error handling Like activity:", error);
    throw error;
  }
}

async function handleAnnounceActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Announce (boost) activity from ${sender}`);
    
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
      await supabaseClient.from("ap_objects").insert({
        type: "Announce",
        attributed_to: remoteActorId,
        content: activity
      });
    }
    
    console.log(`Processed Announce for ${objectUrl}`);
  } catch (error) {
    console.error("Error handling Announce activity:", error);
    throw error;
  }
}

async function handleDeleteActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Delete activity from ${sender}`);
    
    const objectUrl = typeof activity.object === 'string' ? activity.object : activity.object?.id;
    if (!objectUrl) {
      throw new Error("Delete activity missing object reference");
    }
    
    // Check if this is a tombstone (deleted object) 
    const objectType = typeof activity.object === 'object' ? activity.object.type : null;
    
    if (objectType === 'Tombstone') {
      console.log(`Received tombstone for ${objectUrl}`);
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
    
    console.log(`Processed Delete activity: ${data.id} for object ${objectUrl}`);
  } catch (error) {
    console.error("Error handling Delete activity:", error);
    throw error;
  }
}

async function handleUpdateActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Update activity from ${sender}`);
    
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
    
    console.log(`Stored Update activity for object ${objectUrl}`);
    
    // If this is an actor update, refresh the cache
    if (objectType === 'Person' || objectType === 'Service' || objectType === 'Application' || objectType === 'Organization' || objectType === 'Group') {
      console.log(`Actor update received, refreshing cache for ${sender}`);
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
      const localId = extractLocalObjectId(objectUrl);
      if (localId) {
        const { error: updErr } = await supabaseClient
          .from("ap_objects")
          .update({
            content: object,
            updated_at: new Date().toISOString()
          })
          .eq("id", localId);
        if (updErr) console.warn("ap_objects update failed:", updErr);
        else console.log(`Synced Update into ap_objects ${localId}`);
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
    console.log(`Processing Move activity from ${sender}`);
    
    const oldAccount = activity.object;
    const newAccount = activity.target;
    
    if (!oldAccount || !newAccount) {
      throw new Error("Move activity missing object or target");
    }
    
    // Verify that sender matches the object being moved
    const oldAccountUrl = typeof oldAccount === 'string' ? oldAccount : oldAccount.id;
    if (oldAccountUrl !== sender) {
      console.log(`Move activity sender ${sender} doesn't match object ${oldAccountUrl}`);
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
    
    console.log(`Stored Move activity: ${data.id}`);
    
    // Fetch new account to verify alsoKnownAs
    const newAccountUrl = typeof newAccount === 'string' ? newAccount : newAccount.id;
    
    try {
      const response = await fetch(newAccountUrl, {
        headers: { "Accept": "application/activity+json" }
      });
      
      if (response.ok) {
        const newAccountData = await response.json();
        const alsoKnownAs = newAccountData.alsoKnownAs || [];
        
        // Verify the new account lists the old account in alsoKnownAs
        if (!alsoKnownAs.includes(oldAccountUrl)) {
          console.log(`Move verification failed: new account doesn't list old account in alsoKnownAs`);
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
          
          const { buildActorUrl, buildActivityId } = await import("../_shared/federation-urls.ts");
          
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
              "object": newAccountUrl
            };
            
            const { data: pk } = await supabaseClient
              .rpc("actor_id_to_partition_key", { actor_uuid: lf.local_actor_id });
            
            await supabaseClient.from("federation_queue_partitioned").insert({
              actor_id: lf.local_actor_id,
              activity: followActivity,
              status: "pending",
              partition_key: pk ?? 0,
              priority: 7
            });
            
            // Track the new outgoing follow
            await supabaseClient.from("outgoing_follows").upsert({
              local_actor_id: lf.local_actor_id,
              remote_actor_url: newAccountUrl,
              status: "pending"
            }, { onConflict: "local_actor_id,remote_actor_url" });
          }
          
          console.log(`Queued auto re-follow for ${(localFollowers || []).length} local followers`);
          
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
        
        console.log(`Successfully processed Move from ${oldAccountUrl} to ${newAccountUrl}`);
      }
    } catch (fetchError) {
      console.error("Error fetching new account for Move verification:", fetchError);
    }
  } catch (error) {
    console.error("Error handling Move activity:", error);
    throw error;
  }
}

// Handle incoming Flag (moderation report) from a remote instance
async function handleFlagActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Flag (report) from ${sender}`);
    
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
      
      const localId = extractLocalObjectId(objUrl);
      
      await supabaseClient.from("content_reports").insert({
        content_id: localId || objUrl,
        content_type: localId ? "post" : "remote",
        reason: "federated_flag",
        details: `From ${sender}: ${reason}`,
        reporter_id: null as any,
        status: "pending"
      });
    }
    
    console.log(`Stored federated Flag with ${objects.length} target object(s)`);
  } catch (error) {
    console.error("Error handling Flag activity:", error);
    throw error;
  }
}

// Handle incoming Block — record so we don't deliver to the blocker
async function handleBlockActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Block from ${sender}`);
    
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
        .eq("follower_actor_url", sender);
      
      // Stop our outgoing follows toward the blocker
      await supabaseClient
        .from("outgoing_follows")
        .delete()
        .eq("remote_actor_url", sender);
      
      console.log(`Cleared follow relationships with blocker ${sender}`);
    }
  } catch (error) {
    console.error("Error handling Block activity:", error);
    throw error;
  }
}
