
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signRequest } from "../outbox/http-signature.ts";

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function processQueueItem(item: any) {
  console.log(`Processing queue item ${item.id}`);
  
  try {
    // Mark item as processing
    await supabaseClient
      .from("federation_queue")
      .update({ status: "processing", attempts: item.attempts + 1, last_attempted_at: new Date().toISOString() })
      .eq("id", item.id);
    
    // Get the actor data including private key
    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("id, private_key, preferred_username")
      .eq("id", item.actor_id)
      .single();
    
    if (actorError || !actor) {
      throw new Error(`Actor not found: ${actorError?.message}`);
    }
    
    // Determine recipients
    let recipients: string[] = [];
    
    if (item.activity.to) {
      if (Array.isArray(item.activity.to)) {
        recipients = [...recipients, ...item.activity.to];
      } else {
        recipients.push(item.activity.to);
      }
    }
    
    if (item.activity.cc) {
      if (Array.isArray(item.activity.cc)) {
        recipients = [...recipients, ...item.activity.cc];
      } else {
        recipients.push(item.activity.cc);
      }
    }
    
    // Filter out public addresses and local actors
    recipients = recipients.filter(r => 
      r !== "https://www.w3.org/ns/activitystreams#Public" && 
      !r.includes(`${Deno.env.get("SUPABASE_URL")}`)
    );
    
    // Remove duplicates
    recipients = [...new Set(recipients)];
    
    if (recipients.length === 0) {
      console.log("No external recipients to deliver to");
      await supabaseClient
        .from("federation_queue")
        .update({ status: "processed" })
        .eq("id", item.id);
      return;
    }
    
    // For each recipient, deliver the activity
    const deliveryPromises = recipients.map(async (recipient) => {
      try {
        // For simplicity, assume recipient is an actor URL
        // In a real implementation, we'd need to look up the inbox URL
        const inboxUrl = `${recipient}/inbox`;
        const origin = new URL(Deno.env.get("SUPABASE_URL") ?? "").origin;
        const keyId = `${origin}/${actor.preferred_username}#main-key`;
        
        // Create the request with signature
        const body = JSON.stringify(item.activity);
        const date = new Date().toUTCString();
        
        const headers = new Headers({
          "Content-Type": "application/activity+json",
          "Accept": "application/activity+json",
          "User-Agent": "ActivityPub-Demo/1.0.0",
          "Date": date,
          "Host": new URL(inboxUrl).host
        });
        
        // Sign the request
        await signRequest(
          inboxUrl,
          "POST",
          headers,
          body,
          actor.private_key,
          keyId
        );
        
        // Send the request
        const response = await fetch(inboxUrl, {
          method: "POST",
          headers: headers,
          body: body
        });
        
        // Check response
        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`Delivery failed with status ${response.status}: ${responseText}`);
        }
        
        console.log(`Delivery to ${inboxUrl} successful`);
        return true;
      } catch (error) {
        console.error(`Error delivering to ${recipient}:`, error);
        return false;
      }
    });
    
    // Wait for all deliveries to complete
    await Promise.all(deliveryPromises);
    
    // Mark item as processed
    await supabaseClient
      .from("federation_queue")
      .update({ status: "processed" })
      .eq("id", item.id);
    
    console.log(`Queue item ${item.id} processed successfully`);
  } catch (error) {
    console.error(`Error processing queue item ${item.id}:`, error);
    
    // Mark item as failed
    await supabaseClient
      .from("federation_queue")
      .update({ status: "failed" })
      .eq("id", item.id);
  }
}

serve(async (req) => {
  // This function should be triggered by a cron job or manually
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  
  try {
    // Get pending queue items
    const { data: queueItems, error } = await supabaseClient
      .from("federation_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ message: "No pending items" }), { status: 200 });
    }
    
    console.log(`Processing ${queueItems.length} queue items`);
    
    // Process each item
    for (const item of queueItems) {
      // Use waitUntil to process in the background
      EdgeRuntime.waitUntil(processQueueItem(item));
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Started processing ${queueItems.length} items` 
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in federation worker:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
});
