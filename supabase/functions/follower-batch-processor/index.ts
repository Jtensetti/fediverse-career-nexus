import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { SignJWT } from "https://esm.sh/jose@4.14.4";
import { batchResolveInboxUrls, logRequestMetrics } from "../actor/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Maximum number of concurrent requests to send
const MAX_CONCURRENT_REQUESTS = 5;

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

// Function to filter inbox URLs by blocked domains
async function filterBlockedInboxUrls(inboxUrls: string[]): Promise<string[]> {
  const filteredUrls = [];
  
  for (const inboxUrl of inboxUrls) {
    const isBlocked = await isDomainBlocked(inboxUrl);
    if (isBlocked) {
      console.log(`Skipping delivery to blocked domain: ${new URL(inboxUrl).hostname}`);
    } else {
      filteredUrls.push(inboxUrl);
    }
  }
  
  return filteredUrls;
}

// Process a single batch
async function processBatch(batch: any) {
  try {
    console.log(`Processing batch ${batch.id} for actor ${batch.actor_id}`);
    
    // Mark batch as processing
    await supabaseClient
      .from("follower_batches")
      .update({ 
        status: "processing", 
        attempts: batch.attempts + 1, 
        last_attempted_at: new Date().toISOString() 
      })
      .eq("id", batch.id);
    
    // Get the actor data including private key
    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("id, private_key, preferred_username")
      .eq("id", batch.actor_id)
      .single();
    
    if (actorError || !actor) {
      throw new Error(`Actor not found: ${actorError?.message}`);
    }
    
    // Extract actor URIs from batch targets
    const actorUris = [];
    for (const batchTarget of batch.batch_targets) {
      if (Array.isArray(batchTarget)) {
        actorUris.push(...batchTarget);
      }
    }
    
    console.log(`Batch ${batch.id} has ${actorUris.length} actor URIs before inbox resolution`);
    
    // Resolve actual inbox URLs for all actors
    const inboxMap = await batchResolveInboxUrls(actorUris);
    const inboxUrls = Array.from(inboxMap.values());
    
    console.log(`Resolved ${inboxUrls.length} inbox URLs`);
    
    // Filter out blocked domains
    const filteredInboxUrls = await filterBlockedInboxUrls(inboxUrls);
    const filteredCount = filteredInboxUrls.length;
    
    if (inboxUrls.length > filteredCount) {
      console.log(`Filtered out ${inboxUrls.length - filteredCount} targets on blocked domains`);
    }
    
    if (filteredInboxUrls.length === 0) {
      console.log(`Batch ${batch.id} has no valid targets after filtering blocked domains`);
      
      // Mark as processed since there's nothing to deliver
      await supabaseClient
        .from("follower_batches")
        .update({ 
          status: "processed", 
        })
        .eq("id", batch.id);
        
      return { 
        batchId: batch.id, 
        success: true, 
        processed: 0, 
        failures: 0,
        filtered: inboxUrls.length
      };
    }
    
    console.log(`Batch ${batch.id} processing ${filteredInboxUrls.length} targets after filtering`);
    
    // Limit concurrent requests
    const results = [];
    for (let i = 0; i < filteredInboxUrls.length; i += MAX_CONCURRENT_REQUESTS) {
      const chunk = filteredInboxUrls.slice(i, i + MAX_CONCURRENT_REQUESTS);
      const promises = chunk.map(inboxUrl => 
        deliverActivity(inboxUrl, batch.activity, actor)
      );
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      
      // Small delay between chunks to avoid overwhelming the network
      if (i + MAX_CONCURRENT_REQUESTS < filteredInboxUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    // Check if any deliveries failed
    const failures = results.filter(r => !r.success);
    
    // Update batch status based on results
    if (failures.length === 0) {
      await supabaseClient
        .from("follower_batches")
        .update({ 
          status: "processed", 
        })
        .eq("id", batch.id);
        
      console.log(`Batch ${batch.id} processed successfully`);
    } else {
      // If some deliveries failed, mark batch as failed
      const failRate = failures.length / results.length;
      
      // If more than 50% failed, mark as failed, otherwise mark as processed
      // In a production system, you might want different logic here
      if (failRate > 0.5) {
        // Calculate exponential backoff for retry
        const retryDelay = Math.min(Math.pow(2, batch.attempts) * 5000, 3600000); // Max 1 hour
        const nextAttemptAt = new Date(Date.now() + retryDelay).toISOString();
        
        await supabaseClient
          .from("follower_batches")
          .update({ 
            status: "pending",
            next_attempt_at: nextAttemptAt,
          })
          .eq("id", batch.id);
          
        console.log(`Batch ${batch.id} had ${failures.length} failures. Scheduled for retry at ${nextAttemptAt}`);
      } else {
        // Mark as processed even with some failures if the failure rate is acceptable
        await supabaseClient
          .from("follower_batches")
          .update({ 
            status: "processed", 
          })
          .eq("id", batch.id);
          
        console.log(`Batch ${batch.id} processed with ${failures.length} acceptable failures`);
      }
    }
    
    return { 
      batchId: batch.id, 
      success: true, 
      processed: results.length, 
      failures: failures.length,
      filtered: inboxUrls.length - filteredInboxUrls.length
    };
  } catch (error) {
    console.error(`Error processing batch ${batch.id}:`, error);
    
    // Calculate exponential backoff for retry
    const retryDelay = Math.min(Math.pow(2, batch.attempts) * 5000, 3600000); // Max 1 hour
    const nextAttemptAt = new Date(Date.now() + retryDelay).toISOString();
    
    await supabaseClient
      .from("follower_batches")
      .update({ 
        status: "pending",
        next_attempt_at: nextAttemptAt,
      })
      .eq("id", batch.id);
    
    return { batchId: batch.id, success: false, error: error.message };
  }
}

// Deliver activity to a single inbox using the actual inbox URL
async function deliverActivity(inboxUrl: string, activity: any, actor: any) {
  try {
    console.log(`Delivering to actual inbox: ${inboxUrl}`);
    const startTime = performance.now();
    
    // Sign the request
    const keyId = `${new URL(Deno.env.get("SUPABASE_URL") ?? "").origin}/u/${actor.preferred_username}#main-key`;
    const body = JSON.stringify(activity);
    
    // Prepare headers
    const headers = new Headers();
    headers.set("Content-Type", "application/activity+json");
    headers.set("Accept", "application/activity+json");
    headers.set("User-Agent", "ActivityPub-BatchProcessor/1.0");
    headers.set("Date", new Date().toUTCString());
    headers.set("Host", new URL(inboxUrl).host);
    
    // Create signature (simplified for this example)
    // In a real implementation, you'd use HTTP signature
    const privateKey = actor.private_key;
    if (!privateKey) {
      throw new Error("Actor has no private key");
    }
    
    // Simple signature mechanism (this should be replaced with proper HTTP signatures)
    const signed = await signRequest(inboxUrl, "POST", headers, body, privateKey, keyId);
    
    // Send the request to the actual inbox URL
    const response = await fetch(inboxUrl, {
      method: "POST",
      headers: headers,
      body: body
    });
    
    const remoteHost = new URL(inboxUrl).hostname;
    
    // Log metrics
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
      const text = await response.text();
      throw new Error(`HTTP error ${response.status}: ${text}`);
    }
    
    return { inboxUrl, success: true };
  } catch (error) {
    console.error(`Delivery to ${inboxUrl} failed:`, error);
    return { inboxUrl, success: false, error: error.message };
  }
}

// Simple HTTP signature implementation (placeholder)
async function signRequest(
  url: string,
  method: string,
  headers: Headers,
  body: string,
  privateKey: string,
  keyId: string
) {
  // Implementation would depend on your signing strategy
  // This is just a placeholder
  
  // In a real implementation, you'd follow the HTTP Signature spec
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partition = null, batchId = null } = await req.json();
    let query = supabaseClient
      .from("follower_batches")
      .select("*")
      .eq("status", "pending")
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${new Date().toISOString()}`);
    
    // If a specific partition is requested, filter for that partition
    if (partition !== null && partition >= 0 && partition < 4) {
      query = query.eq("partition_key", partition);
      console.log(`Processing partition ${partition}`);
    }
    
    // If a specific batch is requested
    if (batchId) {
      query = supabaseClient
        .from("follower_batches")
        .select("*")
        .eq("id", batchId);
      
      console.log(`Processing specific batch ${batchId}`);
    } 
    
    const { data: batches, error } = await query
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    if (!batches || batches.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No pending batches found",
          partition,
          batchId
        }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log(`Processing ${batches.length} batches`);
    
    // Process batches in sequence, one at a time
    const results = [];
    for (const batch of batches) {
      // For long-running processes, we don't want to block the response
      EdgeRuntime.waitUntil(processBatch(batch));
      results.push({ batchId: batch.id, status: "processing" });
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Started processing ${batches.length} batches`,
        results
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in batch processor:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error processing batches", 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
