import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signRequest, generateRsaKeyPair } from "../_shared/http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Fetch remote actor to get their inbox URL
async function fetchRemoteActor(actorUrl: string): Promise<any> {
  try {
    // Check cache first
    const { data: cached } = await supabaseClient
      .from("remote_actors_cache")
      .select("actor_data")
      .eq("actor_url", actorUrl)
      .single();
    
    if (cached?.actor_data) {
      console.log(`Cache hit for remote actor: ${actorUrl}`);
      return cached.actor_data;
    }
    
    // Fetch from remote
    console.log(`Fetching remote actor: ${actorUrl}`);
    const response = await fetch(actorUrl, {
      headers: {
        "Accept": "application/activity+json, application/ld+json; profile=\"https://www.w3.org/ns/activitystreams\""
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch actor: ${response.status}`);
    }
    
    const actorData = await response.json();
    
    // Cache the actor data
    await supabaseClient
      .from("remote_actors_cache")
      .upsert({
        actor_url: actorUrl,
        actor_data: actorData,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    
    return actorData;
  } catch (error) {
    console.error(`Error fetching remote actor ${actorUrl}:`, error);
    throw error;
  }
}

// Ensure actor has RSA keys
async function ensureActorKeys(actorId: string): Promise<{ privateKey: string; publicKey: string }> {
  const { data: actor, error } = await supabaseClient
    .from("actors")
    .select("private_key, public_key")
    .eq("id", actorId)
    .single();
  
  if (error) throw error;
  
  if (actor.private_key && actor.public_key) {
    return { privateKey: actor.private_key, publicKey: actor.public_key };
  }
  
  // Generate new keys
  console.log(`Generating RSA keys for actor ${actorId}`);
  const keyPair = await generateRsaKeyPair();
  
  await supabaseClient
    .from("actors")
    .update({
      private_key: keyPair.privateKey,
      public_key: keyPair.publicKey
    })
    .eq("id", actorId);
  
  return keyPair;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { remoteActorUrl, localActorId, action = "follow" } = await req.json();
    
    if (!remoteActorUrl || !localActorId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: remoteActorUrl and localActorId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Processing ${action} request from ${localActorId} to ${remoteActorUrl}`);
    
    // Get local actor details
    const { data: localActor, error: actorError } = await supabaseClient
      .from("actors")
      .select("id, preferred_username, user_id")
      .eq("id", localActorId)
      .single();
    
    if (actorError || !localActor) {
      return new Response(
        JSON.stringify({ error: "Local actor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fetch remote actor to get inbox URL
    const remoteActor = await fetchRemoteActor(remoteActorUrl);
    const inbox = remoteActor.inbox;
    
    if (!inbox) {
      return new Response(
        JSON.stringify({ error: "Remote actor has no inbox" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`Remote actor inbox: ${inbox}`);
    
    // Ensure we have keys
    const { privateKey } = await ensureActorKeys(localActorId);
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const localActorUrl = `${supabaseUrl}/functions/v1/actor/${localActor.preferred_username}`;
    const activityId = `${supabaseUrl}/functions/v1/activities/${crypto.randomUUID()}`;
    
    // Create the Follow activity
    const followActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "id": activityId,
      "type": action === "unfollow" ? "Undo" : "Follow",
      "actor": localActorUrl,
      "object": action === "unfollow" ? {
        "type": "Follow",
        "actor": localActorUrl,
        "object": remoteActorUrl
      } : remoteActorUrl,
      "published": new Date().toISOString()
    };
    
    console.log(`Sending ${action} activity:`, JSON.stringify(followActivity));
    
    // Sign and send the request
    const body = JSON.stringify(followActivity);
    const headers = new Headers({
      "Content-Type": "application/activity+json",
      "Accept": "application/activity+json"
    });
    
    // Add HTTP signature
    const keyId = `${localActorUrl}#main-key`;
    await signRequest(inbox, "POST", headers, body, privateKey, keyId);
    
    // Send to remote inbox
    const response = await fetch(inbox, {
      method: "POST",
      headers,
      body
    });
    
    console.log(`Response from ${inbox}: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      
      // Update follow status to failed
      if (action === "follow") {
        await supabaseClient
          .from("outgoing_follows")
          .update({ status: "failed" })
          .eq("local_actor_id", localActorId)
          .eq("remote_actor_url", remoteActorUrl);
      }
      
      return new Response(
        JSON.stringify({ 
          error: "Failed to deliver activity",
          status: response.status,
          details: errorText.substring(0, 200)
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Update the outgoing_follows record
    if (action === "follow") {
      await supabaseClient
        .from("outgoing_follows")
        .upsert({
          local_actor_id: localActorId,
          remote_actor_url: remoteActorUrl,
          status: "pending", // Will become "accepted" when we receive Accept
          updated_at: new Date().toISOString()
        }, {
          onConflict: "local_actor_id,remote_actor_url"
        });
      
      console.log(`Updated outgoing_follows: ${localActorId} -> ${remoteActorUrl}`);
    } else if (action === "unfollow") {
      await supabaseClient
        .from("outgoing_follows")
        .delete()
        .eq("local_actor_id", localActorId)
        .eq("remote_actor_url", remoteActorUrl);
      
      console.log(`Deleted outgoing follow: ${localActorId} -> ${remoteActorUrl}`);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        action,
        activityId,
        remoteActorUrl,
        delivered: true
      }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in send-follow:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});