
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signedFetch } from "../_shared/http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Get sharedInbox map for batched delivery - reduces N calls to M unique endpoints
async function getSharedInboxMap(actorId: string): Promise<Map<string, string[]>> {
  const { data: followers } = await supabaseClient
    .from("actor_followers")
    .select("follower_actor_url")
    .eq("local_actor_id", actorId)
    .eq("status", "accepted");
  
  const inboxMap = new Map<string, string[]>();
  
  for (const follower of followers || []) {
    // Check cache for sharedInbox
    const { data: cached } = await supabaseClient
      .from("remote_actors_cache")
      .select("actor_data")
      .eq("actor_url", follower.follower_actor_url)
      .single();
    
    const actorData = cached?.actor_data as any;
    // Prefer sharedInbox, fallback to individual inbox
    const sharedInbox = actorData?.endpoints?.sharedInbox || actorData?.inbox;
    
    if (sharedInbox) {
      if (!inboxMap.has(sharedInbox)) {
        inboxMap.set(sharedInbox, []);
      }
      inboxMap.get(sharedInbox)!.push(follower.follower_actor_url);
    }
  }
  
  return inboxMap;
}

// Enrich activity if needed (for thin trigger queued items)
async function enrichActivity(item: any): Promise<any> {
  const activity = item.activity;
  
  if (!activity.needs_enrichment) {
    return activity;
  }
  
  // Fetch the full object from ap_objects
  const { data: apObject } = await supabaseClient
    .from("ap_objects")
    .select("*")
    .eq("id", activity.object_id)
    .single();
  
  if (!apObject) {
    console.error(`Object not found for enrichment: ${activity.object_id}`);
    return null;
  }
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  
  // Build full Create activity
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    type: "Create",
    id: `${supabaseUrl}/functions/v1/activities/${apObject.id}`,
    actor: apObject.content?.attributedTo || `${supabaseUrl}/functions/v1/actor/${item.actor_id}`,
    published: apObject.published_at || new Date().toISOString(),
    to: ["https://www.w3.org/ns/activitystreams#Public"],
    cc: [`${supabaseUrl}/functions/v1/actor/${item.actor_id}/followers`],
    object: apObject.content
  };
}

// Mark item as failed with error
async function markAsFailed(itemId: string, error: string) {
  await supabaseClient
    .from("federation_queue_partitioned")
    .update({ 
      status: "failed",
      last_error: error,
      processed_at: new Date().toISOString()
    })
    .eq("id", itemId);
}

// Mark item for retry with exponential backoff
async function scheduleRetry(item: any, error: string) {
  const attempts = (item.attempts || 0) + 1;
  const maxAttempts = item.max_attempts || 10;
  
  if (attempts >= maxAttempts) {
    await markAsFailed(item.id, `Max attempts (${maxAttempts}) reached. Last error: ${error}`);
    return;
  }
  
  // Exponential backoff: 1, 2, 4, 8, 16, 32, 64, 128, 256, 512 minutes
  const backoffMinutes = Math.pow(2, attempts - 1);
  const nextRetry = new Date(Date.now() + backoffMinutes * 60 * 1000);
  
  await supabaseClient
    .from("federation_queue_partitioned")
    .update({ 
      status: "retry",
      attempts,
      next_retry_at: nextRetry.toISOString(),
      last_error: error
    })
    .eq("id", item.id);
  
  console.log(`Scheduled retry ${attempts}/${maxAttempts} for item ${item.id} at ${nextRetry.toISOString()}`);
}

// Mark item as successfully processed
async function markAsProcessed(itemId: string) {
  await supabaseClient
    .from("federation_queue_partitioned")
    .update({ 
      status: "processed",
      processed_at: new Date().toISOString()
    })
    .eq("id", itemId);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 50, partition = 0 } = await req.json().catch(() => ({}));
    
    // Use atomic claim function with SKIP LOCKED to prevent race conditions
    const { data: queueItems, error } = await supabaseClient
      .rpc("claim_federation_items", { 
        p_partition: partition,
        p_limit: limit 
      });
    
    if (error) {
      throw error;
    }
    
    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending federation items", partition }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log(`Processing ${queueItems.length} federation items from partition ${partition}`);
    
    const results = [];
    
    for (const item of queueItems) {
      try {
        // Enrich activity if needed
        const activity = await enrichActivity(item);
        
        if (!activity) {
          await markAsFailed(item.id, "Failed to enrich activity - object not found");
          results.push({ id: item.id, success: false, error: "Object not found" });
          continue;
        }
        
        const actorId = item.actor_id;
        let recipients: string[] = [];
        
        // Handle Accept activities specially - direct delivery to follower
        if (activity.type === "Accept" && activity.object?.type === "Follow") {
          const followerActorUrl = activity.object.actor;
          if (followerActorUrl) {
            recipients.push(followerActorUrl);
            console.log(`Accept activity targeting follower: ${followerActorUrl}`);
          }
        } else if (activity.type === "Delete") {
          // For Delete activities, use sharedInbox batching
          const sharedInboxMap = await getSharedInboxMap(actorId);
          
          // Deliver to each unique sharedInbox
          for (const [inboxUrl, _followers] of sharedInboxMap) {
            try {
              console.log(`Sending Delete to sharedInbox: ${inboxUrl}`);
              const response = await signedFetch(inboxUrl, {
                method: "POST",
                body: JSON.stringify(activity),
              }, actorId);
              
              if (!response.ok) {
                console.error(`Failed to deliver Delete to ${inboxUrl}: ${response.status}`);
              }
            } catch (err) {
              console.error(`Error delivering Delete to ${inboxUrl}:`, err);
            }
          }
          
          await markAsProcessed(item.id);
          results.push({ id: item.id, success: true, type: "Delete" });
          continue;
        } else if (activity.to) {
          // Handle activities with explicit 'to' field
          const toField = Array.isArray(activity.to) ? activity.to : [activity.to];
          recipients.push(...toField.filter((to: string) => 
            typeof to === 'string' && 
            to !== 'https://www.w3.org/ns/activitystreams#Public'
          ));
        }
        
        // If no explicit recipients, use sharedInbox batching for followers
        if (recipients.length === 0 && activity.type === "Create") {
          const sharedInboxMap = await getSharedInboxMap(actorId);
          
          console.log(`Create activity has ${sharedInboxMap.size} unique sharedInboxes`);
          
          let successCount = 0;
          let failCount = 0;
          
          // Deliver to each unique sharedInbox (massive reduction in HTTP calls)
          for (const [inboxUrl, followers] of sharedInboxMap) {
            try {
              console.log(`Sending Create to sharedInbox: ${inboxUrl} (${followers.length} followers)`);
              const response = await signedFetch(inboxUrl, {
                method: "POST",
                body: JSON.stringify(activity),
              }, actorId);
              
              if (!response.ok) {
                console.error(`Failed to deliver to ${inboxUrl}: ${response.status}`);
                failCount++;
              } else {
                successCount++;
              }
            } catch (err) {
              console.error(`Error delivering to ${inboxUrl}:`, err);
              failCount++;
            }
          }
          
          if (failCount > 0 && successCount === 0) {
            // All failed - schedule retry
            await scheduleRetry(item, `All ${failCount} deliveries failed`);
            results.push({ id: item.id, success: false, error: "All deliveries failed" });
          } else {
            await markAsProcessed(item.id);
            results.push({ id: item.id, success: true, delivered: successCount, failed: failCount });
          }
          continue;
        }
        
        // Direct delivery to specific recipients
        console.log(`Activity ${item.id} has ${recipients.length} direct recipients`);
        
        for (const recipientUri of recipients) {
          try {
            console.log(`Determining inbox for recipient: ${recipientUri}`);
            
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            let inboxUrl: string;
            
            if (recipientUri.startsWith(supabaseUrl!)) {
              // Local actor
              const username = recipientUri.split('/').pop();
              inboxUrl = `${supabaseUrl}/functions/v1/inbox/${username}`;
            } else {
              // Remote actor - fetch their actor document for inbox
              const { data: cached } = await supabaseClient
                .from("remote_actors_cache")
                .select("actor_data")
                .eq("actor_url", recipientUri)
                .single();
              
              const actorData = cached?.actor_data as any;
              inboxUrl = actorData?.inbox || `${recipientUri}/inbox`;
            }
            
            console.log(`Sending activity to ${inboxUrl}`);
            
            const response = await signedFetch(inboxUrl, {
              method: "POST",
              body: JSON.stringify(activity),
            }, actorId);
            
            if (!response.ok) {
              const status = response.status;
              console.error(`Failed to deliver to ${inboxUrl}: ${status}`);
              
              // Handle specific status codes
              if (status === 410) {
                // Actor is gone - remove from followers
                await supabaseClient
                  .from("actor_followers")
                  .delete()
                  .eq("follower_actor_url", recipientUri);
                console.log(`Removed gone actor: ${recipientUri}`);
              } else if (status >= 500 || status === 408 || status === 429) {
                // Retry-able errors
                await scheduleRetry(item, `HTTP ${status} from ${inboxUrl}`);
                results.push({ id: item.id, success: false, error: `HTTP ${status}` });
                continue;
              }
            } else {
              console.log(`Successfully delivered to ${inboxUrl}`);
            }
            
          } catch (deliveryError) {
            console.error("Error delivering to recipient:", deliveryError);
            await scheduleRetry(item, deliveryError.message);
            results.push({ id: item.id, success: false, error: deliveryError.message });
            continue;
          }
        }
        
        await markAsProcessed(item.id);
        results.push({ id: item.id, success: true });
        
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        await scheduleRetry(item, itemError.message);
        results.push({ id: item.id, success: false, error: itemError.message });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        partition,
        processed: results.length,
        results 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in federation processor:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error processing federation queue", 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
