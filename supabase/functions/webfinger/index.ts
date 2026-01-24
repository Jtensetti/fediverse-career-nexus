
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const cacheHeaders = {
  "Cache-Control": "public, max-age=300",
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

function getRequestHost(req: Request, url: URL) {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const hostHeader = req.headers.get("host")?.split(",")[0].trim();
  return forwardedHost || hostHeader || url.hostname;
}

function getRequestProtocol(req: Request, url: URL) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return forwardedProto || url.protocol.replace(":", "");
}

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
async function createLocalActorObject(profile: any, baseUrl: string) {
  const actorUrl = `${baseUrl}/functions/v1/actor/${profile.username}`;
  
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
    inbox: `${baseUrl}/functions/v1/inbox/${profile.username}`,
    outbox: `${baseUrl}/functions/v1/outbox/${profile.username}`,
    followers: `${baseUrl}/functions/v1/followers/${profile.username}`,
    following: `${baseUrl}/functions/v1/following/${profile.username}`,
    publicKey: {
      id: `${actorUrl}#main-key`,
      owner: actorUrl,
      publicKeyPem: publicKeyPem
    }
  };
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
    const requestHost = getRequestHost(req, url);
    const requestProtocol = getRequestProtocol(req, url);
    const baseUrl = `${requestProtocol}://${requestHost}`;
    // WebFinger requires a resource parameter
    const resource = url.searchParams.get("resource");

    if (!resource) {
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 400, "Missing resource parameter");
      return new Response(
        JSON.stringify({ error: "Resource parameter is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // WebFinger typically uses acct:username@domain.com format
    const acctMatch = resource.match(/^acct:([^@]+)@(.+)$/i);
    if (!acctMatch) {
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 400, "Invalid resource format");
      return new Response(
        JSON.stringify({ error: "Invalid resource format. Expected acct:username@domain.com" }),
        {
          status: 400,
          headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const username = acctMatch[1];
    const domain = acctMatch[2].toLowerCase();
    const currentDomain = requestHost.toLowerCase();

    if (domain !== currentDomain) {
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 400, "Resource domain mismatch");
      return new Response(
        JSON.stringify({ error: "Resource domain does not match this instance" }),
        {
          status: 400,
          headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Try to get from cache first
    const cacheKey = [CACHE_NAMESPACE, resource];
    const cachedResponse = await kv.get(cacheKey);
    
    if (cachedResponse.value) {
      console.log(`Cache hit for ${resource}`);
      await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, true, 200);
      return new Response(
        JSON.stringify(cachedResponse.value),
        {
          headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/jrd+json" }
        }
      );
    }

    console.log(`Cache miss for ${resource}, processing request`);
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
          headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const actorId = `${baseUrl}/functions/v1/actor/${profile.username}`;
    const profileUrl = `${baseUrl}/profile/${profile.username}`;
    
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
        actorObject = await createLocalActorObject(profile, baseUrl);
        
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
        },
        {
          rel: "http://webfinger.net/rel/profile-page",
          type: "text/html",
          href: profileUrl
        }
      ]
    };

    // Store in KV cache
    await kv.set(cacheKey, webfingerResponse, { expireIn: CACHE_TTL });

    await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, true, 200);
    return new Response(
      JSON.stringify(webfingerResponse),
      {
        headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/jrd+json" }
      }
    );
  } catch (error) {
    console.error("Error processing WebFinger request:", error);
    await logRequestMetrics(remoteHost, "/.well-known/webfinger", startTime, false, 500, error.message);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, ...cacheHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
