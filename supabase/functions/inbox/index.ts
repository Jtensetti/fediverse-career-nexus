
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { encode as encodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";
import { 
  signRequest, 
  verifySignature, 
  ensureActorHasKeys, 
  signedFetch, 
  fetchPublicKey,
  pemToPublicKeyBuffer
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

// Verify HTTP signature with digest and date enforcement
async function verifyRequestSignature(req: Request, body: string): Promise<boolean> {
  const signatureHeader = req.headers.get('Signature');
  const digestHeader = req.headers.get('Digest');
  const dateHeader = req.headers.get('Date');

  if (!signatureHeader || !digestHeader || !dateHeader) {
    console.error('Missing required signature headers');
    return false;
  }

  // Check Date within 5 minutes
  const requestTime = Date.parse(dateHeader);
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) {
    console.error('Date header out of range');
    return false;
  }

  // Verify digest
  const encoder = new TextEncoder();
  const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const expectedDigest = 'SHA-256=' + encodeBase64(new Uint8Array(digestBuffer));
  if (expectedDigest !== digestHeader) {
    console.error('Digest mismatch');
    return false;
  }

  const params: Record<string, string> = {};
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.trim().split('=');
    params[k] = v.replace(/"/g, '');
  }

  const keyId = params['keyId'];
  const signatureB64 = params['signature'];
  const headerNames = (params['headers'] || '').split(' ');

  const url = new URL(req.url);
  const headerValues: Record<string, string> = {
    '(request-target)': `${req.method.toLowerCase()} ${url.pathname}${url.search}`,
    host: url.host,
    date: dateHeader,
    digest: digestHeader,
  };

  const stringToVerify = headerNames
    .map((h) => `${h}: ${headerValues[h] ?? req.headers.get(h)}`)
    .join('\n');

  const publicKeyPem = await getPublicKey(keyId);
  if (!publicKeyPem) {
    console.error('Unable to retrieve public key for', keyId);
    return false;
  }

  const keyBuffer = pemToBuffer(publicKeyPem.replace('PUBLIC KEY', 'PUBLIC KEY')); // reuse helper
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
  const verified = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes,
    encoder.encode(stringToVerify)
  );
  if (!verified) {
    console.error('Signature verification failed');
  }
  return verified;
}

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


serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    if (pathParts.length !== 1) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const username = pathParts[0];
    
    // Look up the actor
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Look up the actor
    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("id, user_id")
      .eq("user_id", profile.id)
      .single();

    if (actorError || !actor) {
      return new Response(
        JSON.stringify({ error: "Actor not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Read body and verify signature
    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch (_err) {
      return new Response(
        JSON.stringify({ error: "Invalid body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!(await verifyRequestSignature(req, bodyText))) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse the activity
    let activity;
    try {
      activity = JSON.parse(bodyText);
    } catch (_error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Persist raw activity for auditing
    await supabaseClient.from('activities').insert({
      actor_id: actor.id,
      type: activity.type,
      payload: activity
    });

    // Validate the activity
    if (!activity.type || !activity.actor) {
      return new Response(
        JSON.stringify({ error: "Invalid activity" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

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
    
    switch (activity.type) {
      case "Follow":
        await handleFollowActivity(activity, actor.id, sender);
        break;
      case "Accept":
        await handleAcceptActivity(activity, actor.id, sender);
        break;
      case "Reject":
        await handleRejectActivity(activity, actor.id, sender);
        break;
      case "Undo":
        await handleUndoActivity(activity, actor.id, sender);
        break;
      case "Create":
        await handleCreateActivity(activity, actor.id, sender);
        break;
      case "Like":
        await handleLikeActivity(activity, actor.id, sender);
        break;
      case "Announce":
        await handleAnnounceActivity(activity, actor.id, sender);
        break;
      case "Delete":
        await handleDeleteActivity(activity, actor.id, sender);
        break;
      case "Update":
        await handleUpdateActivity(activity, actor.id, sender);
        break;
      default:
        console.log(`Unsupported activity type: ${activity.type}`);
        // Store unsupported activities for future reference
        await supabaseClient
          .from("inbox_items")
          .insert({
            recipient_id: actor.id,
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
    
    // Store the follow relationship
    const { data: followData, error: followError } = await supabaseClient
      .from("actor_followers")
      .insert({
        local_actor_id: recipientId,
        follower_actor_url: followerActorUrl,
        status: "accepted"
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
    
    console.log(`Created follow relationship: ${followData.id}`);
    
    // Update follower count
    await supabaseClient
      .from("actors")
      .update({ 
        follower_count: supabaseClient.raw('follower_count + 1') 
      })
      .eq("id", recipientId);
    
    // Get the local actor's username for the Accept activity
    const { data: localActor, error: localActorError } = await supabaseClient
      .from("actors")
      .select("preferred_username")
      .eq("id", recipientId)
      .single();
    
    if (localActorError || !localActor) {
      throw new Error(`Local actor not found: ${localActorError?.message}`);
    }
    
    // Create Accept activity with proper targeting
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const acceptActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Accept",
      "id": `${supabaseUrl}/functions/v1/activities/${crypto.randomUUID()}`,
      "actor": `${supabaseUrl}/functions/v1/actor/${localActor.preferred_username}`,
      "to": followerActorUrl, // Explicitly target the follower's inbox
      "object": activity,
      "published": new Date().toISOString()
    };
    
    console.log(`Created Accept activity targeting ${followerActorUrl}`);
    
    // Queue the Accept activity using the partitioned federation queue
    const { data: partitionKey, error: partitionError } = await supabaseClient
      .rpc("actor_id_to_partition_key", { actor_id: recipientId });

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
    
    // Store the object in the inbox_items table
    const { data, error } = await supabaseClient
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
    
    if (error) {
      throw error;
    }
    
    console.log(`Stored inbox item: ${data.id}`);
  } catch (error) {
    console.error("Error handling Create activity:", error);
    throw error;
  }
}

async function handleLikeActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Like activity from ${sender}`);
    
    const objectUrl = typeof activity.object === 'string' ? activity.object : activity.object?.id;
    if (!objectUrl) {
      throw new Error("Like activity missing object reference");
    }
    
    // Store the like in inbox_items for processing
    const { data, error } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Like",
        object_type: "Note",
        content: activity
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Stored Like activity: ${data.id} for object ${objectUrl}`);
    
    // TODO: Optionally increment like count on the referenced object
    // This would require parsing the objectUrl to find the local post
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
    
    // Store the boost/announce in inbox_items
    const { data, error } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Announce",
        object_type: "Note",
        content: activity
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Stored Announce activity: ${data.id} for object ${objectUrl}`);
    
    // TODO: Optionally increment boost count on the referenced object
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
    
    // Store the update activity
    const { data, error } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: "Update",
        object_type: objectType,
        content: activity
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Stored Update activity: ${data.id} for object ${objectUrl}`);
    
    // If this is an actor update, refresh the cache
    if (objectType === 'Person' || objectType === 'Service' || objectType === 'Application') {
      console.log(`Actor update received, refreshing cache for ${sender}`);
      await supabaseClient
        .from("remote_actors_cache")
        .upsert({
          actor_url: sender,
          actor_data: object,
          fetched_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error("Error handling Update activity:", error);
    throw error;
  }
}
