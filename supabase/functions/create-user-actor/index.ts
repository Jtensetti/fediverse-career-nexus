
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// Create local actor object
function createLocalActorObject(profile: any, domain: string) {
  const actorUrl = `https://${domain}/actor/${profile.username}`;
  
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
      publicKeyPem: "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----" // Placeholder
    }
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('username, fullname, bio')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.username) {
      console.error('Error fetching profile for actor creation:', profileError);
      return new Response(
        JSON.stringify({ error: "Profile not found or missing username" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if actor already exists
    const { data: existingActor } = await supabaseClient
      .from('actors')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingActor) {
      return new Response(
        JSON.stringify({ message: "Actor already exists", actorId: existingActor.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create actor record
    const { data: actorData, error: actorError } = await supabaseClient
      .from('actors')
      .insert({
        user_id: userId,
        preferred_username: profile.username,
        type: 'Person',
        status: 'active'
      })
      .select()
      .single();

    if (actorError) {
      console.error('Error creating actor record:', actorError);
      return new Response(
        JSON.stringify({ error: "Failed to create actor record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get domain from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const domain = new URL(supabaseUrl).hostname;
    
    // Create the ActivityPub actor object
    const actorObject = createLocalActorObject(profile, domain);

    // Store in ap_objects
    const { error: apObjectError } = await supabaseClient
      .from('ap_objects')
      .insert({
        type: 'Person',
        attributed_to: actorData.id,
        content: actorObject
      });

    if (apObjectError) {
      console.error('Error creating ap_object:', apObjectError);
      return new Response(
        JSON.stringify({ error: "Failed to create actor object" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Cache in remote_actors_cache for WebFinger
    const { error: cacheError } = await supabaseClient
      .from('remote_actors_cache')
      .insert({
        actor_url: actorObject.id,
        actor_data: actorObject
      });

    if (cacheError) {
      console.error('Error caching actor:', cacheError);
      // Non-fatal error, continue
    }

    console.log(`Successfully created actor for user ${profile.username}`);
    
    return new Response(
      JSON.stringify({ 
        message: "Actor created successfully", 
        actorId: actorData.id,
        actorUrl: actorObject.id
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing actor creation request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
