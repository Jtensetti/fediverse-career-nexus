import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Timeouts
const WEBFINGER_TIMEOUT_MS = 10000;
const ACTOR_FETCH_TIMEOUT_MS = 10000;

// Two-step domain validation
function isValidDomain(domain: string): boolean {
  // Step 1: Cheap URL constructor check
  try {
    new URL(`https://${domain}`);
  } catch {
    return false;
  }
  
  // Step 2: Character format check (only if Step 1 passes)
  const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domain.length <= 253 && DOMAIN_REGEX.test(domain);
}

// Fetch with AbortController timeout
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Parse resource parameter (supports "acct:user@domain" or "user@domain")
function parseResource(resource: string): { username: string; domain: string } | null {
  const cleanResource = resource.startsWith("acct:") 
    ? resource.slice(5) 
    : resource;
  
  const parts = cleanResource.split("@");
  if (parts.length !== 2) {
    return null;
  }
  
  const [username, domain] = parts;
  if (!username || !domain) {
    return null;
  }
  
  return { username, domain };
}

// Check WebFinger cache
async function getFromCache(acct: string): Promise<{ actorUrl: string; inboxUrl: string | null } | null> {
  const { data, error } = await supabaseClient
    .from("webfinger_cache")
    .select("actor_url, inbox_url, expires_at")
    .eq("acct", acct)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    console.log(`Cache expired for ${acct}`);
    return null;
  }
  
  // Increment hit count (non-blocking)
  supabaseClient
    .from("webfinger_cache")
    .update({ hit_count: supabaseClient.rpc("increment_hit_count", { acct }) })
    .eq("acct", acct)
    .then(() => {})
    .catch(() => {});
  
  return { actorUrl: data.actor_url, inboxUrl: data.inbox_url };
}

// Save to WebFinger cache
async function saveToCache(acct: string, actorUrl: string, inboxUrl: string | null): Promise<void> {
  try {
    await supabaseClient
      .from("webfinger_cache")
      .upsert({
        acct,
        actor_url: actorUrl,
        inbox_url: inboxUrl,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        hit_count: 0
      }, { onConflict: "acct" });
  } catch (error) {
    console.error("Failed to cache WebFinger result:", error);
  }
}

// Also check/update remote_actors_cache for actor document
async function getActorFromCache(actorUrl: string): Promise<{ inbox: string | null } | null> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabaseClient
    .from("remote_actors_cache")
    .select("actor_data")
    .eq("actor_url", actorUrl)
    .gte("fetched_at", oneHourAgo)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  const actorData = data.actor_data as Record<string, unknown>;
  return { inbox: (actorData?.inbox as string) || null };
}

// Save actor document to cache
async function saveActorToCache(actorUrl: string, actorData: Record<string, unknown>): Promise<void> {
  try {
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: actorUrl,
        actor_data: actorData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      }, { onConflict: "actor_url" });
  } catch (error) {
    console.error("Failed to cache actor document:", error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const resource = body.resource as string;

    if (!resource) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'resource' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the resource
    const parsed = parseResource(resource);
    if (!parsed) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid resource format. Use 'user@domain' or 'acct:user@domain'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { username, domain } = parsed;

    // Validate domain
    if (!isValidDomain(domain)) {
      console.warn(`Invalid domain rejected: ${domain}`);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid domain format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const acct = `${username}@${domain}`;
    console.log(`Looking up remote actor: ${acct}`);

    // Step 1: Check WebFinger cache
    const cached = await getFromCache(acct);
    if (cached) {
      console.log(`WebFinger cache hit for ${acct}`);
      return new Response(
        JSON.stringify({
          success: true,
          actorUrl: cached.actorUrl,
          inbox: cached.inboxUrl,
          cached: true
        }),
        { 
          status: 200, 
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600" // 1 hour browser cache
          } 
        }
      );
    }

    // Step 2: Perform WebFinger lookup
    const webfingerUrl = `https://${domain}/.well-known/webfinger?resource=${encodeURIComponent(`acct:${acct}`)}`;
    console.log(`WebFinger request: ${webfingerUrl}`);

    let webfingerResponse: Response;
    try {
      webfingerResponse = await fetchWithTimeout(
        webfingerUrl,
        {
          headers: {
            "Accept": "application/jrd+json, application/json",
            "User-Agent": "Nolto-Federation/1.0 (+https://nolto.social)"
          }
        },
        WEBFINGER_TIMEOUT_MS
      );
    } catch (error) {
      if (error.name === "AbortError") {
        console.error(`WebFinger timeout for ${domain}`);
        return new Response(
          JSON.stringify({ success: false, error: "Remote server timed out" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    if (!webfingerResponse.ok) {
      console.info(`WebFinger ${webfingerResponse.status} for ${acct}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: webfingerResponse.status === 404 ? "User not found on remote server" : "WebFinger lookup failed"
        }),
        { status: webfingerResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const webfingerData = await webfingerResponse.json();

    // Find the ActivityPub actor link
    const actorLink = webfingerData.links?.find(
      (link: { rel?: string; type?: string; href?: string }) =>
        link.rel === "self" &&
        (link.type === "application/activity+json" ||
          link.type === 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"')
    );

    if (!actorLink?.href) {
      console.warn(`No ActivityPub actor found for ${acct}`);
      return new Response(
        JSON.stringify({ success: false, error: "No ActivityPub actor found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const actorUrl = actorLink.href as string;
    console.log(`Resolved ${acct} -> ${actorUrl}`);

    // Step 3: Check actor cache for inbox
    let inboxUrl: string | null = null;
    const cachedActor = await getActorFromCache(actorUrl);
    
    if (cachedActor?.inbox) {
      inboxUrl = cachedActor.inbox;
      console.log(`Actor cache hit for inbox: ${inboxUrl}`);
    } else {
      // Step 4: Fetch actor document to get inbox
      console.log(`Fetching actor document: ${actorUrl}`);
      try {
        const actorResponse = await fetchWithTimeout(
          actorUrl,
          {
            headers: {
              "Accept": 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
              "User-Agent": "Nolto-Federation/1.0 (+https://nolto.social)"
            }
          },
          ACTOR_FETCH_TIMEOUT_MS
        );

        if (actorResponse.ok) {
          const actorData = await actorResponse.json();
          inboxUrl = actorData.inbox || null;
          
          // Cache the actor document
          await saveActorToCache(actorUrl, actorData);
          console.log(`Cached actor document for ${actorUrl}`);
        }
      } catch (actorError) {
        console.error(`Failed to fetch actor document: ${actorError}`);
        // Continue without inbox - we still have the actor URL
      }
    }

    // Step 5: Cache WebFinger result
    await saveToCache(acct, actorUrl, inboxUrl);

    return new Response(
      JSON.stringify({
        success: true,
        actorUrl,
        inbox: inboxUrl,
        cached: false
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600"
        } 
      }
    );

  } catch (error) {
    console.error("Lookup remote actor error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
