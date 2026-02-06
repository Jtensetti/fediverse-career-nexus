// Helper functions for the actor endpoint

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Simple in-memory cache (resets on cold starts but that's fine for short-term caching)
const memoryCache = new Map<string, { data: any; expiresAt: number }>();
export const CACHE_NAMESPACE = "actor";
export const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Initialize the Supabase client
export const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Log federation request metrics
export async function logRequestMetrics(
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

// Get actor from cache
export async function getActorFromCache(username: string) {
  const cacheKey = `${CACHE_NAMESPACE}:${username}`;
  const cached = memoryCache.get(cacheKey);
  
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`Cache hit for actor ${username}`);
    return cached.data;
  }
  
  return null;
}

// Fetch actor from database
export async function fetchActorFromDatabase(username: string) {
  // Look up the user in the profiles table first
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, username, fullname, avatar_url")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    console.error("Profile not found:", profileError);
    return { error: "User not found", status: 404 };
  }

  // Look up the actor in the actors table
  const { data: actor, error: actorError } = await supabaseClient
    .from("actors")
    .select("*")
    .eq("user_id", profile.id)
    .single();

  if (actorError) {
    console.error("Actor not found:", actorError);
    return { error: "Actor not found", status: 404 };
  }

  // Check if the actor's federation is disabled
  if (actor.status === "disabled") {
    return { error: "This account has disabled federation", status: 410 };
  }
  
  return { profile, actor };
}

// Check if an object is a Tombstone (deleted content)
export async function checkTombstone(objectId: string): Promise<{ isTombstone: boolean; tombstoneData?: any }> {
  const { data: apObject, error } = await supabaseClient
    .from("ap_objects")
    .select("id, type, content")
    .eq("id", objectId)
    .single();
  
  if (error || !apObject) {
    return { isTombstone: false };
  }
  
  if (apObject.type === "Tombstone") {
    return { 
      isTombstone: true, 
      tombstoneData: {
        "@context": "https://www.w3.org/ns/activitystreams",
        type: "Tombstone",
        id: objectId,
        formerType: apObject.content?.formerType || "Note",
        deleted: apObject.content?.deleted || new Date().toISOString()
      }
    };
  }
  
  return { isTombstone: false };
}

// Create a local actor record and return profile and actor
export async function createLocalActor(username: string) {
  // Look up the user profile
  const { data: profile, error: profileError } = await supabaseClient
    .from("public_profiles")
    .select("id, username, fullname, avatar_url")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    console.error("Profile not found for actor creation:", profileError);
    return null;
  }

  // Create actor record
  const { data: actor, error: actorError } = await supabaseClient
    .from("actors")
    .insert({
      user_id: profile.id,
      preferred_username: profile.username,
      type: "Person",
      status: "active",
    })
    .select()
    .single();

  if (actorError || !actor) {
    console.error("Error creating actor record:", actorError);
    return null;
  }

  // Build actor object and store for future use
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const domain = new URL(supabaseUrl).hostname;
  const protocol = "https:";
  const actorObject = createActorObject(profile, actor, domain, protocol);

  try {
    await supabaseClient.from("ap_objects").insert({
      type: "Person",
      attributed_to: actor.id,
      content: actorObject,
    });
    await supabaseClient.from("remote_actors_cache").upsert({
      actor_url: actorObject.id,
      actor_data: actorObject,
      fetched_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error caching new actor:", error);
  }

  return { profile, actor };
}

// Resolve inbox URL for a given actor URI
export async function resolveInboxUrl(actorUri: string): Promise<string | null> {
  console.log(`Resolving inbox URL for actor: ${actorUri}`);
  
  // First, try to get from local actors table
  const { data: localActor, error: localError } = await supabaseClient
    .from("actors")
    .select("inbox_url")
    .eq("preferred_username", actorUri.split('/').pop())
    .single();
  
  if (!localError && localActor?.inbox_url) {
    console.log(`Found local actor inbox: ${localActor.inbox_url}`);
    return localActor.inbox_url;
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
export async function batchResolveInboxUrls(actorUris: string[]): Promise<Map<string, string>> {
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

// Store remote actor data when processing Follow activities
export async function storeRemoteActorData(actorUri: string, actorData: any) {
  try {
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: actorUri,
        actor_data: actorData,
        fetched_at: new Date().toISOString()
      });
    
    console.log(`Stored remote actor data for ${actorUri}`);
  } catch (error) {
    console.error(`Error storing remote actor data for ${actorUri}:`, error);
  }
}

// Create actor object - use nolto.social domain for federation discoverability
export function createActorObject(profile: any, actor: any, domain: string, protocol: string) {
  // Use the production domain for actor URLs to ensure proper federation
  const NOLTO_DOMAIN = Deno.env.get("SITE_URL")?.replace("https://", "").replace("http://", "") ?? "nolto.social";
  const baseUrl = `https://${NOLTO_DOMAIN}`;
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? baseUrl;
  const actorUrl = `${baseUrl}/functions/v1/actor/${profile.username}`;

  // Create a ActivityPub actor object following the Mastodon schema
  const actorObject = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
      {
        "manuallyApprovesFollowers": "as:manuallyApprovesFollowers",
        "toot": "http://joinmastodon.org/ns#",
        "featured": {
          "@id": "toot:featured",
          "@type": "@id"
        },
        "featuredTags": {
          "@id": "toot:featuredTags",
          "@type": "@id"
        },
        "alsoKnownAs": {
          "@id": "as:alsoKnownAs",
          "@type": "@id"
        },
        "movedTo": {
          "@id": "as:movedTo",
          "@type": "@id"
        },
        "schema": "http://schema.org#",
        "PropertyValue": "schema:PropertyValue",
        "value": "schema:value",
        "discoverable": "toot:discoverable",
        "Device": "toot:Device",
        "Ed25519Signature": "toot:Ed25519Signature",
        "Ed25519Key": "toot:Ed25519Key",
        "Curve25519Key": "toot:Curve25519Key",
        "EncryptedMessage": "toot:EncryptedMessage",
        "publicKeyBase64": "toot:publicKeyBase64",
        "deviceId": "toot:deviceId",
        "claim": {
          "@type": "@id",
          "@id": "toot:claim"
        },
        "fingerprintKey": {
          "@type": "@id",
          "@id": "toot:fingerprintKey"
        },
        "identityKey": {
          "@type": "@id",
          "@id": "toot:identityKey"
        },
        "devices": {
          "@type": "@id",
          "@id": "toot:devices"
        },
        "messageFranking": "toot:messageFranking",
        "messageType": "toot:messageType",
        "cipherText": "toot:cipherText",
        "suspended": "toot:suspended"
      }
    ],
    "id": actorUrl,
    "type": "Person",
    "following": `${baseUrl}/functions/v1/following/${profile.username}`,
    "followers": `${baseUrl}/functions/v1/followers/${profile.username}`,
    "inbox": actor.inbox_url || `${baseUrl}/functions/v1/inbox/${profile.username}`,
    "outbox": actor.outbox_url || `${baseUrl}/functions/v1/outbox/${profile.username}`,
    "featured": `${actorUrl}/collections/featured`,
    "featuredTags": `${actorUrl}/collections/tags`,
    "preferredUsername": actor.preferred_username || profile.username,
    "name": profile.fullname || profile.username,
    "summary": "",
    "url": `${baseUrl}/@${profile.username}`,
    "manuallyApprovesFollowers": false,
    "discoverable": true,
    "published": new Date(actor.created_at).toISOString(),
    "devices": `${actorUrl}/collections/devices`,
    "publicKey": {
      "id": `${actorUrl}#main-key`,
      "owner": actorUrl,
      "publicKeyPem": actor.public_key || ""
    },
    "tag": [],
    "attachment": [],
    "endpoints": {
      "sharedInbox": `${baseUrl}/functions/v1/inbox`
    },
    "icon": profile.avatar_url ? {
      "type": "Image",
      "mediaType": "image/jpeg",
      "url": profile.avatar_url
    } : null,
    "fingerprint": actor.key_fingerprint,
    "alsoKnownAs": actor.also_known_as || [],
    "movedTo": actor.moved_to || null
  };

  // Filter out null values
  Object.keys(actorObject).forEach(key => 
    (actorObject[key] === null || actorObject[key] === undefined) && delete actorObject[key]
  );
  
  return actorObject;
}

// Cache actor
export async function cacheActor(username: string, actorObject: any) {
  const cacheKey = `${CACHE_NAMESPACE}:${username}`;
  memoryCache.set(cacheKey, { data: actorObject, expiresAt: Date.now() + CACHE_TTL });
  
  // Store in the database cache too for cross-function availability
  try {
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: actorObject.id,
        actor_data: actorObject,
        fetched_at: new Date().toISOString()
      });
  } catch (cacheError) {
    console.error("Error caching actor in database:", cacheError);
    // Non-fatal, continue even if database caching fails
  }
}
