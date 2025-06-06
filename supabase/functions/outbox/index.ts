import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { signRequest, generateRsaKeyPair } from "./http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Deno KV store for caching
const kv = await Deno.openKv();
const CACHE_NAMESPACE = "outbox";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Function to generate unique activity and object IDs
function generateActivityId(username: string, actorId: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const activityUuid = crypto.randomUUID();
  return `${supabaseUrl}/functions/v1/activities/${activityUuid}`;
}

function generateObjectId(username: string, objectType: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const objectUuid = crypto.randomUUID();
  return `${supabaseUrl}/functions/v1/objects/${objectUuid}`;
}

// Function to assign IDs to activity and embedded objects
function assignActivityIds(activity: any, username: string, actorId: string): any {
  const enrichedActivity = { ...activity };
  
  // Generate unique ID for the activity if not present
  if (!enrichedActivity.id) {
    enrichedActivity.id = generateActivityId(username, actorId);
  }
  
  // Add published timestamp if not present
  if (!enrichedActivity.published) {
    enrichedActivity.published = new Date().toISOString();
  }
  
  // Handle embedded objects
  if (enrichedActivity.object && typeof enrichedActivity.object === 'object') {
    const obj = enrichedActivity.object;
    
    // Generate unique ID for the object if not present
    if (!obj.id) {
      const objectType = obj.type || 'Object';
      obj.id = generateObjectId(username, objectType);
    }
    
    // Add published timestamp to object if not present
    if (!obj.published) {
      obj.published = new Date().toISOString();
    }
    
    // Ensure object has proper attribution
    if (!obj.attributedTo) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      obj.attributedTo = `${supabaseUrl}/functions/v1/actor/${username}`;
    }
    
    enrichedActivity.object = obj;
  }
  
  return enrichedActivity;
}

// Basic schema for ActivityPub objects
const objectSchema = z.object({
  type: z.string(),
  id: z.string().url().optional()
}).passthrough();

// Strict schema for outbound ActivityPub activities
const activitySchema = z.object({
  '@context': z.any().optional(),
  type: z.string(),
  actor: z.string().url().optional(),
  object: objectSchema,
  to: z.union([z.array(z.string()), z.string()]).optional(),
  cc: z.union([z.array(z.string()), z.string()]).optional(),
  published: z.string().optional(),
  id: z.string().optional()
}).passthrough();

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

    // Handle different HTTP methods
    if (req.method === "GET") {
      return await handleGetOutbox(req, actor.id, profile.username);
    } else if (req.method === "POST") {
      return await handlePostOutbox(req, actor.id, profile.username);
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error processing outbox request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function handleGetOutbox(req: Request, actorId: string, username: string): Promise<Response> {
  const url = new URL(req.url);
  const page = url.searchParams.get("page");
  
  // If no page is specified, return the outbox collection
  if (!page) {
    return await getOutboxCollection(actorId, username, url.origin);
  }
  
  // If page is specified, return the page of activities
  return await getOutboxPage(actorId, username, page, url.origin);
}

async function getOutboxCollection(actorId: string, username: string, origin: string): Promise<Response> {
  const cacheKey = [CACHE_NAMESPACE, actorId, "collection"];
  const cachedResponse = await kv.get(cacheKey);
  
  if (cachedResponse.value) {
    console.log(`Cache hit for outbox collection of ${username}`);
    return new Response(
      JSON.stringify(cachedResponse.value),
      {
        headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
      }
    );
  }
  
  console.log(`Cache miss for outbox collection of ${username}, fetching from database`);
  
  // Count the total number of activities for this actor
  const { count, error: countError } = await supabaseClient
    .from("ap_objects")
    .select("*", { count: "exact", head: true })
    .eq("attributed_to", actorId)
    .eq("type", "Create");
  
  if (countError) {
    console.error("Error counting activities:", countError);
    return new Response(
      JSON.stringify({ error: "Error retrieving activities" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  // Create the outbox collection object
  const outboxCollection = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": `${origin}/${username}/outbox`,
    "type": "OrderedCollection",
    "totalItems": count,
    "first": `${origin}/${username}/outbox?page=1`,
    "last": `${origin}/${username}/outbox?page=${Math.ceil(count / 20) || 1}`
  };
  
  // Store in cache
  await kv.set(cacheKey, outboxCollection, { expireIn: CACHE_TTL });
  
  return new Response(
    JSON.stringify(outboxCollection),
    {
      headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
    }
  );
}

async function getOutboxPage(actorId: string, username: string, page: string, origin: string): Promise<Response> {
  const pageNum = parseInt(page, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return new Response(
      JSON.stringify({ error: "Invalid page number" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  const pageSize = 20;
  const offset = (pageNum - 1) * pageSize;
  
  const cacheKey = [CACHE_NAMESPACE, actorId, "page", pageNum.toString()];
  const cachedResponse = await kv.get(cacheKey);
  
  if (cachedResponse.value) {
    console.log(`Cache hit for outbox page ${pageNum} of ${username}`);
    return new Response(
      JSON.stringify(cachedResponse.value),
      {
        headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
      }
    );
  }
  
  console.log(`Cache miss for outbox page ${pageNum} of ${username}, fetching from database`);
  
  // Fetch activities for this page
  const { data: activities, error: activitiesError } = await supabaseClient
    .from("ap_objects")
    .select("*")
    .eq("attributed_to", actorId)
    .eq("type", "Create")
    .order("published_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  if (activitiesError) {
    console.error("Error fetching activities:", activitiesError);
    return new Response(
      JSON.stringify({ error: "Error retrieving activities" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  // Format activities for ActivityPub
  const formattedActivities = activities.map(activity => activity.content);
  
  // Create the page object
  const outboxPage = {
    "@context": "https://www.w3.org/ns/activitystreams",
    "id": `${origin}/${username}/outbox?page=${pageNum}`,
    "type": "OrderedCollectionPage",
    "partOf": `${origin}/${username}/outbox`,
    "orderedItems": formattedActivities,
  };
  
  // Add prev/next links if applicable
  if (pageNum > 1) {
    outboxPage["prev"] = `${origin}/${username}/outbox?page=${pageNum - 1}`;
  }
  
  // Check if there are more pages
  const { count, error: countError } = await supabaseClient
    .from("ap_objects")
    .select("*", { count: "exact", head: true })
    .eq("attributed_to", actorId)
    .eq("type", "Create");
  
  if (!countError && count > offset + pageSize) {
    outboxPage["next"] = `${origin}/${username}/outbox?page=${pageNum + 1}`;
  }
  
  // Store in cache
  await kv.set(cacheKey, outboxPage, { expireIn: CACHE_TTL });
  
  return new Response(
    JSON.stringify(outboxPage),
    {
      headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
    }
  );
}

async function handlePostOutbox(req: Request, actorId: string, username: string): Promise<Response> {
  // Check if request is authorized
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Verify JWT token
  try {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Check if this user owns the actor
    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("user_id")
      .eq("id", actorId)
      .single();
    
    if (actorError || !actor || actor.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  const expectedActorUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/actor/${username}`;
  
  // Parse and validate activity from request body
  let activity;
  try {
    const body = await req.json();
    const result = activitySchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({ error: "Invalid activity", details: result.error.issues }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    activity = result.data;
    if (activity.actor && activity.actor !== expectedActorUrl) {
      return new Response(
        JSON.stringify({ error: "Actor URL mismatch" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    if (!activity.actor) {
      activity.actor = expectedActorUrl;
    }
    if (typeof activity.to === "string") {
      activity.to = [activity.to];
    }
    if (typeof activity.cc === "string") {
      activity.cc = [activity.cc];
    }
  } catch (_error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON in request body" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  // ASSIGN UNIQUE IDs - This is the key change
  const enrichedActivity = assignActivityIds(activity, username, actorId);
  
  console.log(`Generated activity ID: ${enrichedActivity.id}`);
  if (enrichedActivity.object?.id) {
    console.log(`Generated object ID: ${enrichedActivity.object.id}`);
  }
  
  // Check if actor has RSA keys, generate if not
  const { data: actorData, error: actorError } = await supabaseClient
    .from("actors")
    .select("id, private_key, public_key")
    .eq("id", actorId)
    .single();
    
  if (actorError) {
    console.error("Error retrieving actor keys:", actorError);
    return new Response(
      JSON.stringify({ error: "Error retrieving actor data" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  let privateKey = actorData.private_key;
  let publicKey = actorData.public_key;
  
  // Generate keys if they don't exist
  if (!privateKey || !publicKey) {
    try {
      console.log(`Generating new RSA key pair for actor ${actorId}`);
      const keyPair = await generateRsaKeyPair();
      
      // Save keys to the database
      const { error: updateError } = await supabaseClient
        .from("actors")
        .update({
          private_key: keyPair.privateKey,
          public_key: keyPair.publicKey
        })
        .eq("id", actorId);
      
      if (updateError) {
        console.error("Error saving key pair:", updateError);
        return new Response(
          JSON.stringify({ error: "Error generating keys" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
      
      privateKey = keyPair.privateKey;
      publicKey = keyPair.publicKey;
      console.log(`Successfully generated and stored RSA keys for actor ${actorId}`);
    } catch (error) {
      console.error("Error generating key pair:", error);
      return new Response(
        JSON.stringify({ error: "Error generating keys" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  }
  
  // Store in ap_objects table for local retrieval with enriched activity
  const { data: apObject, error: apObjectError } = await supabaseClient
    .from("ap_objects")
    .insert({
      type: enrichedActivity.type,
      attributed_to: actorId,
      content: enrichedActivity
    })
    .select()
    .single();
  
  if (apObjectError) {
    console.error("Error storing activity in ap_objects:", apObjectError);
    // Not returning error here as the activity might still be delivered
  }
  
  // Use the new batch system for Create activities that should be sent to followers
  if (enrichedActivity.type === "Create" && 
      (enrichedActivity.to?.includes("https://www.w3.org/ns/activitystreams#Public") || 
       enrichedActivity.cc?.includes("https://www.w3.org/ns/activitystreams#Public"))) {
    try {
      // Create batches of followers
      const { data: batchResult, error: batchError } = await supabaseClient.rpc(
        "create_follower_batches",
        {
          p_actor_id: actorId,
          p_activity: enrichedActivity, // Use enriched activity with IDs
          p_batch_size: 100
        }
      );
      
      if (batchError) {
        console.error("Error creating follower batches:", batchError);
        // Fall back to the federation queue for this case
        const { data: partitionKey } = await supabaseClient.rpc(
          "actor_id_to_partition_key",
          { actor_id: actorId }
        );
        const { data: queueItem, error: queueError } = await supabaseClient
          .from("federation_queue_partitioned")
          .insert({
            activity: enrichedActivity, // Use enriched activity with IDs
            actor_id: actorId,
            status: "pending",
            partition_key: partitionKey
          })
          .select()
          .single();
        
        if (queueError) {
          console.error("Error adding activity to federation queue:", queueError);
        }
      } else {
        console.log(`Created ${batchResult} follower batches for delivery with HTTP signatures`);
        
        // Trigger batch processing in the background
        EdgeRuntime.waitUntil(
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/follower-batch-processor`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
            },
            body: JSON.stringify({})
          }).catch(err => console.error("Error invoking batch processor:", err))
        );
        
        return new Response(
          JSON.stringify({ 
            success: true,
            message: "Activity accepted and batched for federation with HTTP signatures",
            activityId: enrichedActivity.id,
            objectId: enrichedActivity.object?.id,
            batches: batchResult,
            signed: true
          }),
          {
            status: 202,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    } catch (error) {
      console.error("Error using batch system:", error);
      // Fall back to federation queue
    }
  }
  
  // If we didn't use the batch system or it failed, fall back to the regular queue
  const { data: partitionKey } = await supabaseClient.rpc(
    "actor_id_to_partition_key",
    { actor_id: actorId }
  );
  const { data: queueItem, error: queueError } = await supabaseClient
    .from("federation_queue_partitioned")
    .insert({
      activity: enrichedActivity, // Use enriched activity with IDs
      actor_id: actorId,
      status: "pending",
      partition_key: partitionKey
    })
    .select()
    .single();
  
  if (queueError) {
    console.error("Error adding activity to federation queue:", queueError);
    return new Response(
      JSON.stringify({ error: "Error processing activity" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
  
  return new Response(
    JSON.stringify({ 
      success: true,
      message: "Activity accepted and queued for federation with HTTP signatures",
      activityId: enrichedActivity.id,
      objectId: enrichedActivity.object?.id,
      id: queueItem.id,
      signed: true
    }),
    {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    }
  );
}
