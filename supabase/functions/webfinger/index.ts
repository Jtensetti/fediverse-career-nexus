
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Deno KV store for caching
const kv = await Deno.openKv();
const CACHE_NAMESPACE = "webfinger";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

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

// Create local actor object on-demand
async function createLocalActorObject(profile: any, domain: string) {
  const actorUrl = `https://${domain}/actor/${profile.username}`;
  
  // Try to get the actual public key from the actors table
  let publicKeyPem = "";
  const { data: actor, error: actorError } = await supabaseClient
    .from("actors")
    .select("public_key")
    .eq("user_id", profile.id)
    .single();
  
  if (!actorError && actor?.public_key) {
    publicKeyPem = actor.public_key;
  }
  
  return {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1"
    ],
    id: actorUrl,
    type: "Person",
    preferredUsername: profile.username,
    name: profile.fullname || profile.username,
    summary: profile.bio || "",
    inbox: `${actorUrl}/inbox`,
    outbox: `${actorUrl}/outbox`,
    followers: `${actorUrl}/followers`,
    following: `${actorUrl}/following`,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: publicKeyPem
    }
  };
}

// Fetch remote WebFinger
async function fetchRemoteWebFinger(domain: string, username: string) {
  const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=acct:${username}@${domain}`;
  
  console.log(`Fetching remote WebFinger: ${webfingerUrl}`);
  
  const response = await fetch(webfingerUrl, {
    headers: {
      'Accept': 'application/jrd+json, application/json',
      'User-Agent': 'Supabase-ActivityPub/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`WebFinger request failed: ${response.status} ${response.statusText}`);
  }
  
  const webfingerData = await response.json();
  
  // Find the self link with ActivityPub profile
  const selfLink = webfingerData.links?.find((link: any) => 
    link.rel === "self" && link.type === "application/activity+json"
  );
  
  if (!selfLink) {
    throw new Error("No ActivityPub self link found in WebFinger response");
  }
  
  return {
    webfingerData,
    actorUrl: selfLink.href
  };
}

// Fetch and cache remote actor
async function fetchAndCacheRemoteActor(actorUrl: string) {
  console.log(`Fetching remote actor: ${actorUrl}`);
  
  const response = await fetch(actorUrl, {
    headers: {
      'Accept': 'application/activity+json, application/ld+json',
      'User-Agent': 'Supabase-ActivityPub/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Actor request failed: ${response.status} ${response.statusText}`);
  }
  
  const actorData = await response.json();
  
  // Validate required ActivityPub fields
  if (!actorData.id || !actorData.inbox) {
    throw new Error("Invalid actor data: missing required fields (id, inbox)");
  }
  
  // Cache the actor data in our database
  try {
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: actorData.id,
        actor_data: actorData,
        fetched_at: new Date().toISOString()
      });
      
    console.log(`Successfully cached remote actor: ${actorData.id}`);
  } catch (error) {
    console.error("Error caching remote actor:", error);
    // Non-fatal, continue even if caching fails
  }
  
  return actorData;
}

serve(async (req) => {
  // Start measuring request time
  const startTime = performance.now();
  const remoteHost = new URL(req.url).hostname;
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // WebFinger requires a resource parameter
    const resource = url.searchParams.get("resource");

    if (!resource) {
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 400, "Missing resource parameter");
      return new Response(
        JSON.stringify({ error: "Resource parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // WebFinger typically uses acct:username@domain.com format
    const acctMatch = resource.match(/^acct:(.+)@(.+)$/);
    if (!acctMatch) {
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 400, "Invalid resource format");
      return new Response(
        JSON.stringify({ error: "Invalid resource format. Expected acct:username@domain.com" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const username = acctMatch[1];
    const domain = acctMatch[2];
    const currentDomain = url.hostname;

    // Try to get from cache first
    const cacheKey = [CACHE_NAMESPACE, resource];
    const cachedResponse = await kv.get(cacheKey);
    
    if (cachedResponse.value) {
      console.log(`Cache hit for ${resource}`);
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, true, 200);
      return new Response(
        JSON.stringify(cachedResponse.value),
        {
          headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
        }
      );
    }

    console.log(`Cache miss for ${resource}, processing request`);

    // Handle remote domains
    if (domain !== currentDomain) {
      try {
        // First check if we have the remote actor cached in our database
        const { data: cachedRemoteActor, error } = await supabaseClient
          .from("remote_actors_cache")
          .select("actor_data")
          .eq("actor_url", `https://${domain}/${username}`)
          .single();
          
        let actorUrl;
        
        if (!error && cachedRemoteActor) {
          // We have this remote actor cached, use it
          actorUrl = cachedRemoteActor.actor_data.id;
          console.log(`Found cached remote actor: ${actorUrl}`);
        } else {
          // Need to fetch from remote
          console.log(`Fetching remote WebFinger and actor for ${username}@${domain}`);
          
          const { webfingerData, actorUrl: fetchedActorUrl } = await fetchRemoteWebFinger(domain, username);
          actorUrl = fetchedActorUrl;
          
          // Fetch and cache the actor
          await fetchAndCacheRemoteActor(actorUrl);
        }
        
        // Create WebFinger response for the remote actor
        const webfingerResponse = {
          subject: resource,
          links: [
            {
              rel: "self",
              type: "application/activity+json",
              href: actorUrl
            }
          ]
        };
        
        // Store in KV cache
        await kv.set(cacheKey, webfingerResponse, { expireIn: CACHE_TTL });
        
        await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, true, 200);
        return new Response(
          JSON.stringify(webfingerResponse),
          {
            headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
          }
        );
        
      } catch (error) {
        console.error(`Error fetching remote actor ${username}@${domain}:`, error);
        await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 404, error.message);
        return new Response(
          JSON.stringify({ error: "Remote actor not found or unreachable" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Handle local domain
    console.log(`Processing local user ${username} on domain ${currentDomain}`);

    // Look up the user in the database
    const { data: profile, error: profileError } = await supabaseClient
      .from("public_profiles")
      .select("id, username, fullname, bio")
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 404, "User not found");
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const actorId = `https://${currentDomain}/actor/${profile.username}`;
    
    // Try to get actor from cache first
    let { data: cachedActor, error: cacheError } = await supabaseClient
      .from("remote_actors_cache")
      .select("actor_data")
      .eq("actor_url", actorId)
      .single();
      
    let actorObject;
    
    if (!cacheError && cachedActor) {
      // Found in cache
      actorObject = cachedActor.actor_data;
      console.log(`Found cached local actor: ${actorId}`);
    } else {
      // Try to find in ap_objects
      const { data: apObject, error: apError } = await supabaseClient
        .from("ap_objects")
        .select("content")
        .eq("type", "Person")
        .eq("content->>'preferredUsername'", username)
        .single();
        
      if (!apError && apObject) {
        actorObject = apObject.content;
        console.log(`Found actor in ap_objects: ${actorId}`);
        
        // Cache it for future requests
        try {
          await supabaseClient
            .from("remote_actors_cache")
            .upsert({
              actor_url: actorId,
              actor_data: actorObject,
              fetched_at: new Date().toISOString()
            });
        } catch (cachingError) {
          console.error("Error caching local actor:", cachingError);
        }
      } else {
        // Create actor on-demand
        console.log(`Creating actor on-demand for ${username}`);
        actorObject = await createLocalActorObject(profile, currentDomain);
        
        // Try to find or create actor record
        let { data: actorRecord } = await supabaseClient
          .from("actors")
          .select("id")
          .eq("user_id", profile.id)
          .single();
          
        if (!actorRecord) {
          const { data: newActor, error: actorInsertError } = await supabaseClient
            .from("actors")
            .insert({
              user_id: profile.id,
              preferred_username: profile.username,
              type: 'Person',
              status: 'active'
            })
            .select("id")
            .single();
            
          if (!actorInsertError) {
            actorRecord = newActor;
          }
        }
        
        // Store in ap_objects if we have an actor record
        if (actorRecord) {
          try {
            await supabaseClient
              .from("ap_objects")
              .insert({
                type: 'Person',
                attributed_to: actorRecord.id,
                content: actorObject
              });
          } catch (apInsertError) {
            console.error("Error storing actor in ap_objects:", apInsertError);
          }
        }
        
        // Cache the actor
        try {
          await supabaseClient
            .from("remote_actors_cache")
            .upsert({
              actor_url: actorId,
              actor_data: actorObject,
              fetched_at: new Date().toISOString()
            });
        } catch (cachingError) {
          console.error("Error caching generated actor:", cachingError);
        }
      }
    }

    // Construct WebFinger response
    const webfingerResponse = {
      subject: resource,
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: actorId
        }
      ]
    };

    // Store in KV cache
    await kv.set(cacheKey, webfingerResponse, { expireIn: CACHE_TTL });

    await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, true, 200);
    return new Response(
      JSON.stringify(webfingerResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
      }
    );
  } catch (error) {
    console.error("Error processing WebFinger request:", error);
    await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 500, error.message);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
