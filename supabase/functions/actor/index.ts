
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { 
  corsHeaders,
  getActorFromCache,
  fetchActorFromDatabase,
  createActorObject,
  cacheActor,
  createLocalActor,
  logRequestMetrics
} from "./utils.ts";

serve(async (req) => {
  // Start measuring request time
  const startTime = performance.now();
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const remoteHost = url.hostname;
    
    // The path structure is /functions/v1/actor/:username or /actor/:username
    // Find the username - it's the last part after 'actor'
    const actorIndex = pathParts.indexOf('actor');
    let username: string | undefined;
    
    if (actorIndex !== -1 && actorIndex < pathParts.length - 1) {
      username = pathParts[actorIndex + 1];
    } else if (pathParts.length === 1) {
      // Direct call with just username
      username = pathParts[0];
    }
    
    if (!username) {
      await logRequestMetrics(remoteHost, url.pathname, startTime, false, 404);
      return new Response(
        JSON.stringify({ error: "Not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Try to get from cache first
    const cachedActor = await getActorFromCache(username);
    
    if (cachedActor) {
      await logRequestMetrics(remoteHost, url.pathname, startTime, true, 200);
      return new Response(
        JSON.stringify(cachedActor),
        {
          headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
        }
      );
    }

    console.log(`Cache miss for actor ${username}, fetching from database`);

    // Fetch actor from database
    let result = await fetchActorFromDatabase(username);

    if ('error' in result) {
      if (result.error === "Actor not found") {
        console.log(`Auto-creating actor for ${username}`);
        const created = await createLocalActor(username);
        if (!created) {
          await logRequestMetrics(remoteHost, url.pathname, startTime, false, result.status, result.error);
          return new Response(
            JSON.stringify({ error: result.error }),
            {
              status: result.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        result = created;
      } else {
        await logRequestMetrics(remoteHost, url.pathname, startTime, false, result.status, result.error);
        return new Response(
          JSON.stringify({ error: result.error }),
          {
            status: result.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    const { profile, actor } = result;
    const domain = url.hostname;
    const protocol = url.protocol;

    // Create the actor object
    const actorObject = createActorObject(profile, actor, domain, protocol);

    // Cache the actor
    await cacheActor(username, actorObject);
    
    await logRequestMetrics(remoteHost, url.pathname, startTime, true, 200);
    return new Response(
      JSON.stringify(actorObject),
      {
        headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
      }
    );
  } catch (error) {
    console.error("Error processing Actor request:", error);
    
    await logRequestMetrics(
      new URL(req.url).hostname,
      new URL(req.url).pathname,
      startTime,
      false,
      500,
      error.message
    );
    
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
