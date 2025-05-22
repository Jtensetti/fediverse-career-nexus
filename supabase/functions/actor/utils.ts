
// Helper functions for the actor endpoint

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Initialize the Deno KV store for caching
export const kv = await Deno.openKv();
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
  const cacheKey = [CACHE_NAMESPACE, username];
  const cachedResponse = await kv.get(cacheKey);
  
  if (cachedResponse.value) {
    console.log(`Cache hit for actor ${username}`);
    return cachedResponse.value;
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

// Create actor object
export function createActorObject(profile: any, actor: any, domain: string, protocol: string) {
  const baseUrl = `${protocol}//${domain}`;

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
    "id": `${baseUrl}/${profile.username}`,
    "type": "Person",
    "following": `${baseUrl}/${profile.username}/following`,
    "followers": `${baseUrl}/${profile.username}/followers`,
    "inbox": actor.inbox_url || `${baseUrl}/${profile.username}/inbox`,
    "outbox": actor.outbox_url || `${baseUrl}/${profile.username}/outbox`,
    "featured": `${baseUrl}/${profile.username}/collections/featured`,
    "featuredTags": `${baseUrl}/${profile.username}/collections/tags`,
    "preferredUsername": actor.preferred_username || profile.username,
    "name": profile.fullname || profile.username,
    "summary": "",
    "url": `${baseUrl}/@${profile.username}`,
    "manuallyApprovesFollowers": false,
    "discoverable": true,
    "published": new Date(actor.created_at).toISOString(),
    "devices": `${baseUrl}/users/${profile.username}/collections/devices`,
    "publicKey": {
      "id": `${baseUrl}/${profile.username}#main-key`,
      "owner": `${baseUrl}/${profile.username}`,
      "publicKeyPem": actor.public_key || ""
    },
    "tag": [],
    "attachment": [],
    "endpoints": {
      "sharedInbox": `${baseUrl}/inbox`
    },
    "icon": profile.avatar_url ? {
      "type": "Image",
      "mediaType": "image/jpeg",
      "url": profile.avatar_url
    } : null,
    "fingerprint": actor.key_fingerprint
  };

  // Filter out null values
  Object.keys(actorObject).forEach(key => 
    (actorObject[key] === null || actorObject[key] === undefined) && delete actorObject[key]
  );
  
  return actorObject;
}

// Cache actor
export async function cacheActor(username: string, actorObject: any, baseUrl: string) {
  const cacheKey = [CACHE_NAMESPACE, username];
  await kv.set(cacheKey, actorObject, { expireIn: CACHE_TTL });
  
  // Store in the database cache too for cross-function availability
  try {
    const cacheUrl = `${baseUrl}/${username}`;
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: cacheUrl,
        actor_data: actorObject,
        fetched_at: new Date().toISOString()
      });
  } catch (cacheError) {
    console.error("Error caching actor in database:", cacheError);
    // Non-fatal, continue even if database caching fails
  }
}
