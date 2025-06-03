
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { signRequest } from "./http-signature.ts";

// Helper function to ensure an actor has RSA keys
export async function ensureActorHasKeys(actorId: string): Promise<{
  keyId: string;
  privateKey: string;
} | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Check if actor has keys
    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id, private_key, public_key, preferred_username")
      .eq("id", actorId)
      .single();
    
    if (actorError || !actor) {
      console.error("Error fetching actor:", actorError);
      return null;
    }
    
    // If keys exist, return them
    if (actor.private_key && actor.public_key) {
      const keyId = `${supabaseUrl}/functions/v1/actor/${actor.preferred_username}#main-key`;
      return {
        keyId,
        privateKey: actor.private_key
      };
    }
    
    // Generate new keys using the RPC function
    const { error: generateError } = await supabase.rpc('ensure_actor_keys', {
      actor_id: actorId
    });
    
    if (generateError) {
      console.error("Error generating keys:", generateError);
      return null;
    }
    
    // Fetch the newly generated keys
    const { data: updatedActor, error: refetchError } = await supabase
      .from("actors")
      .select("private_key, preferred_username")
      .eq("id", actorId)
      .single();
    
    if (refetchError || !updatedActor?.private_key) {
      console.error("Error retrieving generated keys:", refetchError);
      return null;
    }
    
    const keyId = `${supabaseUrl}/functions/v1/actor/${updatedActor.preferred_username}#main-key`;
    return {
      keyId,
      privateKey: updatedActor.private_key
    };
  } catch (error) {
    console.error("Error in ensureActorHasKeys:", error);
    return null;
  }
}

// Helper function to sign and send federation requests
export async function signedFetch(
  url: string,
  options: RequestInit,
  actorId: string
): Promise<Response> {
  const keys = await ensureActorHasKeys(actorId);
  
  if (!keys) {
    throw new Error("Failed to get actor keys for signing");
  }
  
  const headers = new Headers(options.headers);
  
  // Ensure required headers are present
  if (!headers.has("Date")) {
    headers.set("Date", new Date().toUTCString());
  }
  if (!headers.has("Host")) {
    headers.set("Host", new URL(url).host);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/activity+json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/activity+json");
  }
  
  const body = options.body?.toString() || "";
  
  // Sign the request
  await signRequest(url, options.method || "POST", headers, body, keys.privateKey, keys.keyId);
  
  // Make the signed request
  return fetch(url, {
    ...options,
    headers
  });
}
