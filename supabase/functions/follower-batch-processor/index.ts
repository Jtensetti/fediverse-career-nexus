
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signRequest, ensureActorHasKeys } from "../_shared/http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Maximum number of concurrent requests to send (increased from 5 to 25 for better throughput)
const MAX_CONCURRENT_REQUESTS = 25;

// Per-host connection limit to prevent overwhelming single instances
const MAX_CONCURRENT_PER_HOST = 5;

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
        response_time_ms: responseTimeMs,
        request_id: crypto.randomUUID(),
        user_agent: "ActivityPub-BatchProcessor/1.0"
      });
  } catch (error) {
    console.error("Failed to log request metrics:", error);
  }
}

// Resolve inbox URL for a given actor URI
async function resolveInboxUrl(actorUri: string): Promise<string | null> {
  console.log(`Resolving inbox URL for actor: ${actorUri}`);
  
  // First, try to get from local actors table
  const { data: localActor, error: localError } = await supabaseClient
    .from("actors")
    .select("preferred_username")
    .eq("preferred_username", actorUri.split('/').pop())
    .single();
  
  if (!localError && localActor) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const inboxUrl = `${supabaseUrl}/functions/v1/inbox/${localActor.preferred_username}`;
    console.log(`Found local actor inbox: ${inboxUrl}`);
    return inboxUrl;
  }
  
  // Try to get from remote actors cache
  const { data: cachedActor, error: cacheError } = await supabaseClient
    .from("remote_actors_cache")
    .select("actor_data")
    .eq("actor_url", actorUri)
    .single();
  
  if (!cacheError && cachedActor?.actor_data?.inbox) {
    console.log(`Found cached actor inbox: ${cachedActor.actor_data.inbox}`);
    return cachedActor.actor_data.inbox;
  }
  
  // Fallback: fetch actor profile and cache it
  console.log(`Fetching actor profile for inbox URL: ${actorUri}`);
  return await fetchAndCacheActorInbox(actorUri);
}

// Fetch actor profile and extract inbox URL
async function fetchAndCacheActorInbox(actorUri: string): Promise<string | null> {
  try {
    const startTime = performance.now();
    const response = await fetch(actorUri, {
      headers: {
        "Accept": "application/activity+json, application/ld+json",
        "User-Agent": "ActivityPub-Federation/1.0"
      }
    });
    
    const remoteHost = new URL(actorUri).hostname;
    
    if (!response.ok) {
      await logRequestMetrics(remoteHost, "/actor", startTime, false, response.status);
      console.error(`Failed to fetch actor ${actorUri}: ${response.status}`);
      return null;
    }
    
    const actorData = await response.json();
    await logRequestMetrics(remoteHost, "/actor", startTime, true, response.status);
    
    // Cache the actor data
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: actorUri,
        actor_data: actorData,
        fetched_at: new Date().toISOString()
      });
    
    console.log(`Cached actor data for ${actorUri}, inbox: ${actorData.inbox}`);
    return actorData.inbox || null;
  } catch (error) {
    console.error(`Error fetching actor profile ${actorUri}:`, error);
    return null;
  }
}

// Batch resolve inbox URLs for multiple actors
async function batchResolveInboxUrls(actorUris: string[]): Promise<Map<string, string>> {
  const inboxMap = new Map<string, string>();
  
  // Get all cached data in one query
  const { data: cachedActors } = await supabaseClient
    .from("remote_actors_cache")
    .select("actor_url, actor_data")
    .in("actor_url", actorUris);
  
  // Build cache lookup
  const cacheMap = new Map();
  cachedActors?.forEach(cached => {
    if (cached.actor_data?.inbox) {
      cacheMap.set(cached.actor_url, cached.actor_data.inbox);
    }
  });
  
  // Process each actor URI
  for (const actorUri of actorUris) {
    // Check cache first
    if (cacheMap.has(actorUri)) {
      inboxMap.set(actorUri, cacheMap.get(actorUri));
      continue;
    }
    
    // Fallback to individual resolution
    const inboxUrl = await resolveInboxUrl(actorUri);
    if (inboxUrl) {
      inboxMap.set(actorUri, inboxUrl);
    } else {
      // Use fallback construction as last resort
      console.warn(`Could not resolve inbox for ${actorUri}, using fallback`);
      inboxMap.set(actorUri, `${actorUri}/inbox`);
    }
  }
  
  return inboxMap;
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
    
    // Ensure actor has RSA keys
    if (!actor.private_key) {
      console.log(`Actor ${actor.preferred_username} missing private key, generating...`);
      
      // Call the ensure actor keys function
      const { error: ensureKeysError } = await supabaseClient.rpc('ensure_actor_keys', {
        actor_id: batch.actor_id
      });
      
      if (ensureKeysError) {
        throw new Error(`Failed to generate keys for actor: ${ensureKeysError.message}`);
      }
      
      // Refetch actor with new keys
      const { data: updatedActor, error: refetchError } = await supabaseClient
        .from("actors")
        .select("id, private_key, preferred_username")
        .eq("id", batch.actor_id)
        .single();
      
      if (refetchError || !updatedActor?.private_key) {
        throw new Error(`Failed to retrieve generated keys for actor`);
      }
      
      actor.private_key = updatedActor.private_key;
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
    
    // Group inbox URLs by host for per-host rate limiting
    const inboxesByHost = new Map<string, string[]>();
    for (const inboxUrl of filteredInboxUrls) {
      try {
        const host = new URL(inboxUrl).hostname;
        if (!inboxesByHost.has(host)) {
          inboxesByHost.set(host, []);
        }
        inboxesByHost.get(host)!.push(inboxUrl);
      } catch {
        // Invalid URL, skip
      }
    }
    
    // Process with adaptive batching - respect per-host limits
    const results = [];
    const pendingUrls = [...filteredInboxUrls];
    const activeByHost = new Map<string, number>();
    
    while (pendingUrls.length > 0 || results.length < filteredInboxUrls.length) {
      // Select next batch respecting per-host limits
      const batch = [];
      const toRemove = [];
      
      for (let i = 0; i < pendingUrls.length && batch.length < MAX_CONCURRENT_REQUESTS; i++) {
        const url = pendingUrls[i];
        try {
          const host = new URL(url).hostname;
          const activeCount = activeByHost.get(host) || 0;
          
          if (activeCount < MAX_CONCURRENT_PER_HOST) {
            batch.push(url);
            toRemove.push(i);
            activeByHost.set(host, activeCount + 1);
          }
        } catch {
          toRemove.push(i);
        }
      }
      
      // Remove selected URLs from pending (in reverse order to preserve indices)
      for (let i = toRemove.length - 1; i >= 0; i--) {
        pendingUrls.splice(toRemove[i], 1);
      }
      
      if (batch.length === 0) {
        // All remaining URLs are rate-limited, wait a bit
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // Execute batch
      const promises = batch.map(async (inboxUrl) => {
        const result = await deliverActivity(inboxUrl, batch.activity, actor);
        // Decrement active count for host
        const host = new URL(inboxUrl).hostname;
        activeByHost.set(host, (activeByHost.get(host) || 1) - 1);
        return result;
      });
      
      const chunkResults = await Promise.all(promises);
      results.push(...chunkResults);
      
      // Small delay between chunks for network breathing room
      if (pendingUrls.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
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

// Deliver activity to a single inbox using proper HTTP signatures
async function deliverActivity(inboxUrl: string, activity: any, actor: any) {
  try {
    console.log(`Delivering to actual inbox: ${inboxUrl}`);
    const startTime = performance.now();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const keyId = `${supabaseUrl}/functions/v1/actor/${actor.preferred_username}#main-key`;
    const body = JSON.stringify(activity);
    
    // Prepare headers
    const headers = new Headers();
    headers.set("Content-Type", "application/activity+json");
    headers.set("Accept", "application/activity+json");
    headers.set("User-Agent", "ActivityPub-BatchProcessor/1.0");
    headers.set("Date", new Date().toUTCString());
    headers.set("Host", new URL(inboxUrl).host);
    
    // Sign the request using the real HTTP signature implementation
    if (!actor.private_key) {
      throw new Error("Actor has no private key for signing");
    }
    
    await signRequest(inboxUrl, "POST", headers, body, actor.private_key, keyId);
    
    console.log(`Signed request to ${inboxUrl} with key ${keyId}`);
    
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
    
    console.log(`Successfully delivered to ${inboxUrl} with HTTP signature`);
    return { inboxUrl, success: true };
  } catch (error) {
    console.error(`Delivery to ${inboxUrl} failed:`, error);
    return { inboxUrl, success: false, error: error.message };
  }
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
