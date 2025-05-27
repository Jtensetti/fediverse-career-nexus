import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signRequest } from "./http-signature.ts";

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Log federation request metrics
async function logRequestMetrics(
  remoteHost: string, 
  endpoint: string, 
  startTime: number, 
  success: boolean, 
  statusCode?: number, 
  errorMessage?: string
) {
  const endTime = performance.now();
  const responseTimeMs = Math.round(endTime - startTime);
  
  try {
    await supabaseClient
      .from("federation_request_logs")
      .insert({
        remote_host: remoteHost,
        endpoint,
        success,
        response_time_ms: responseTimeMs,
        status_code: statusCode,
        error_message: errorMessage
      });
  } catch (error) {
    console.error("Failed to log request metrics:", error);
    // Non-blocking - we don't want metrics logging to break functionality
  }
}

// Function to check if a domain is blocked
async function isDomainBlocked(url: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname;
    
    const { data, error } = await supabaseClient
      .from('blocked_domains')
      .select('status')
      .eq('host', host)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Error checking blocked domain:', error);
      return false; // Fail open - don't block if we can't check
    }
    
    return data?.status === 'blocked';
  } catch (error) {
    console.error('Error parsing URL for domain check:', error);
    return false;
  }
}

// Function to filter recipients by blocked domains
async function filterBlockedRecipients(recipients: string[]): Promise<string[]> {
  const filteredRecipients = [];
  
  for (const recipient of recipients) {
    const isBlocked = await isDomainBlocked(recipient);
    if (isBlocked) {
      console.log(`Skipping delivery to blocked domain: ${new URL(recipient).hostname}`);
    } else {
      filteredRecipients.push(recipient);
    }
  }
  
  return filteredRecipients;
}

async function processQueueItem(item: any) {
  console.log(`Processing queue item ${item.id}`);
  
  try {
    // Mark item as processing
    await supabaseClient
      .from("federation_queue_partitioned")
      .update({ status: "processing", attempts: item.attempts + 1, last_attempted_at: new Date().toISOString() })
      .eq("id", item.id)
      .eq("partition_key", item.partition_key);
    
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
    
    // Filter out blocked domains
    const originalCount = recipients.length;
    recipients = await filterBlockedRecipients(recipients);
    const filteredCount = recipients.length;
    
    if (originalCount > filteredCount) {
      console.log(`Filtered out ${originalCount - filteredCount} recipients on blocked domains`);
    }
    
    if (recipients.length === 0) {
      console.log("No external recipients to deliver to (after filtering blocked domains)");
      await supabaseClient
        .from("federation_queue_partitioned")
        .update({ status: "processed" })
        .eq("id", item.id)
        .eq("partition_key", item.partition_key);
      return;
    }
    
    // For each recipient, deliver the activity
    const deliveryPromises = recipients.map(async (recipient) => {
      try {
        // Start timing the request
        const startTime = performance.now();
        
        // For simplicity, assume recipient is an actor URL
        // In a real implementation, we'd need to look up the inbox URL
        const inboxUrl = `${recipient}/inbox`;
        const remoteHost = new URL(inboxUrl).hostname;
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
        
        // Log the metrics regardless of success
        await logRequestMetrics(
          remoteHost, 
          "/inbox", 
          startTime, 
          response.ok, 
          response.status, 
          response.ok ? undefined : `HTTP ${response.status}`
        );
        
        // Check response
        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`Delivery failed with status ${response.status}: ${responseText}`);
        }
        
        console.log(`Delivery to ${inboxUrl} successful`);
        return true;
      } catch (error) {
        console.error(`Error delivering to ${recipient}:`, error);
        
        // Try to extract host for metrics logging on failure
        try {
          const remoteHost = new URL(recipient).hostname;
          await logRequestMetrics(
            remoteHost, 
            "/inbox", 
            performance.now() - 100, // Estimate start time since we don't have it at this point
            false, 
            0, 
            error.message
          );
        } catch (logError) {
          console.error("Error logging metrics on failure:", logError);
        }
        
        return false;
      }
    });
    
    // Wait for all deliveries to complete
    await Promise.all(deliveryPromises);
    
    // Mark item as processed
    await supabaseClient
      .from("federation_queue_partitioned")
      .update({ status: "processed" })
      .eq("id", item.id)
      .eq("partition_key", item.partition_key);
    
    console.log(`Queue item ${item.id} processed successfully`);
  } catch (error) {
    console.error(`Error processing queue item ${item.id}:`, error);
    
    // Calculate exponential backoff for retry
    const retryDelay = Math.min(Math.pow(2, item.attempts) * 5000, 3600000); // Max 1 hour
    const nextAttemptAt = new Date(Date.now() + retryDelay).toISOString();
    
    // Mark item for retry with exponential backoff
    await supabaseClient
      .from("federation_queue_partitioned")
      .update({ 
        status: "pending",
        last_attempted_at: new Date().toISOString(),
        next_attempt_at: nextAttemptAt
      })
      .eq("id", item.id)
      .eq("partition_key", item.partition_key);
    
    console.log(`Scheduled item ${item.id} for retry at ${nextAttemptAt}`);
  }
}

serve(async (req) => {
  // This function should be triggered by a cron job or manually
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }
  
  try {
    const { partition = null } = await req.json();
    let query = supabaseClient
      .from("federation_queue_partitioned")
      .select("*")
      .eq("status", "pending")
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`);
    
    // If a specific partition is requested, filter for that partition
    if (partition !== null && partition >= 0 && partition <= 3) {
      query = query.eq("partition_key", partition);
      console.log(`Processing partition ${partition}`);
    } else {
      console.log("No specific partition requested, processing all pending items");
    }
    
    const { data: queueItems, error } = await query
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (!queueItems || queueItems.length === 0) {
      return new Response(JSON.stringify({ 
        message: partition !== null 
          ? `No pending items in partition ${partition}` 
          : "No pending items" 
      }), { status: 200 });
    }
    
    console.log(`Processing ${queueItems.length} queue items${partition !== null ? ` from partition ${partition}` : ''}`);
    
    // Process each item
    for (const item of queueItems) {
      // Use waitUntil to process in the background
      EdgeRuntime.waitUntil(processQueueItem(item));
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Started processing ${queueItems.length} items${partition !== null ? ` from partition ${partition}` : ''}`
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in federation worker:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500 }
    );
  }
});
