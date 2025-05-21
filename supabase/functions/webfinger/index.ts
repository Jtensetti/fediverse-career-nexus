
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // WebFinger requires a resource parameter
    const resource = url.searchParams.get("resource");

    if (!resource) {
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

    // Check if domain matches our domain
    const currentDomain = url.hostname;
    if (domain !== currentDomain) {
      // Check if this is a remote domain we might have cached
      const remoteActorUrl = `https://${domain}/${username}`;
      try {
        // Look up in our remote actor cache
        const { data: cachedRemoteActor, error } = await supabaseClient
          .from("remote_actors_cache")
          .select("actor_data")
          .eq("actor_url", remoteActorUrl)
          .single();
          
        if (!error && cachedRemoteActor) {
          // We have this remote actor cached, create a WebFinger response for it
          const webfingerResponse = {
            subject: resource,
            links: [
              {
                rel: "self",
                type: "application/activity+json",
                href: remoteActorUrl
              }
            ]
          };
          
          return new Response(
            JSON.stringify(webfingerResponse),
            {
              headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
            }
          );
        }
      } catch (cacheError) {
        console.error("Error checking remote actor cache:", cacheError);
      }
      
      // Not found in our cache, return domain mismatch error
      return new Response(
        JSON.stringify({ error: "Domain does not match" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Try to get from cache first
    const cacheKey = [CACHE_NAMESPACE, username];
    const cachedResponse = await kv.get(cacheKey);
    
    if (cachedResponse.value) {
      console.log(`Cache hit for ${username}`);
      return new Response(
        JSON.stringify(cachedResponse.value),
        {
          headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
        }
      );
    }

    console.log(`Cache miss for ${username}, fetching from database`);

    // If not in cache, look up the user in the database
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .single();

    if (error || !profile) {
      console.error("Error fetching profile:", error);
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if we have an actor object for this user
    const actorId = `https://${currentDomain}/${profile.username}`;
    
    // Try to get from remote_actors_cache first (our own actors would be cached here too)
    const { data: cachedActor, error: cacheError } = await supabaseClient
      .from("remote_actors_cache")
      .select("actor_data")
      .eq("actor_url", actorId)
      .single();
      
    if (!cacheError && cachedActor) {
      // We found it in the cache
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
      
      return new Response(
        JSON.stringify(webfingerResponse),
        {
          headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
        }
      );
    }

    // Lookup the actor object for this user
    const { data: actorObject, error: actorError } = await supabaseClient
      .from("ap_objects")
      .select("id, type, content")
      .eq("type", "Person")
      .eq("attributed_to", profile.id)
      .single();

    if (actorError || !actorObject) {
      console.error("Actor not found:", actorError);
      return new Response(
        JSON.stringify({ error: "Actor not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
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
    
    // Also cache the actor object for future use
    try {
      await supabaseClient
        .from("remote_actors_cache")
        .upsert({
          actor_url: actorId,
          actor_data: actorObject.content,
          fetched_at: new Date().toISOString()
        });
    } catch (cachingError) {
      console.error("Error caching actor:", cachingError);
      // Non-fatal error, continue
    }

    return new Response(
      JSON.stringify(webfingerResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/jrd+json" }
      }
    );
  } catch (error) {
    console.error("Error processing WebFinger request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
