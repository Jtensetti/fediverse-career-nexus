import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signedFetch } from "../federation/utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

async function handleFollowActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Follow activity from ${sender} to recipient ${recipientId}`);
    
    const followerActorUrl = activity.actor;
    if (!followerActorUrl) {
      throw new Error("Follow activity missing actor field");
    }
    
    // Store the follow relationship
    const { data: followData, error: followError } = await supabaseClient
      .from("actor_followers")
      .insert({
        local_actor_id: recipientId,
        follower_actor_url: followerActorUrl,
        status: "accepted"
      })
      .select()
      .single();
    
    if (followError) {
      if (followError.code === '23505') { // unique constraint violation
        console.log(`Follow relationship already exists between ${followerActorUrl} and ${recipientId}`);
        return;
      }
      throw followError;
    }
    
    console.log(`Created follow relationship: ${followData.id}`);
    
    // Update follower count
    await supabaseClient
      .from("actors")
      .update({ 
        follower_count: supabaseClient.raw('follower_count + 1') 
      })
      .eq("id", recipientId);
    
    // Get the local actor's username for the Accept activity
    const { data: localActor, error: localActorError } = await supabaseClient
      .from("actors")
      .select("preferred_username")
      .eq("id", recipientId)
      .single();
    
    if (localActorError || !localActor) {
      throw new Error(`Local actor not found: ${localActorError?.message}`);
    }
    
    // Create Accept activity with proper targeting
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const acceptActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Accept",
      "id": `${supabaseUrl}/functions/v1/activities/${crypto.randomUUID()}`,
      "actor": `${supabaseUrl}/functions/v1/actor/${localActor.preferred_username}`,
      "to": followerActorUrl, // Explicitly target the follower's inbox
      "object": activity,
      "published": new Date().toISOString()
    };
    
    console.log(`Created Accept activity targeting ${followerActorUrl}`);
    
    // Queue the Accept activity for federation
    const { error: queueError } = await supabaseClient
      .from("federation_queue")
      .insert({
        activity: acceptActivity,
        actor_id: recipientId,
        status: "pending"
      });
    
    if (queueError) {
      console.error("Error queuing Accept activity:", queueError);
      throw queueError;
    }
    
    console.log(`Queued Accept activity for delivery to ${followerActorUrl}`);
  } catch (error) {
    console.error("Error handling Follow activity:", error);
    throw error;
  }
}

async function handleUndoActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Undo activity from ${sender}`);
    
    // Check if the object is a Follow activity
    if (activity.object?.type === "Follow") {
      await handleUnfollowActivity(activity.object, recipientId, sender);
    } else {
      console.log(`Unsupported Undo object type: ${activity.object?.type}`);
    }
  } catch (error) {
    console.error("Error handling Undo activity:", error);
    throw error;
  }
}

async function handleUnfollowActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Unfollow (via Undo) from ${sender}`);
    
    const followerActorUrl = activity.actor;
    if (!followerActorUrl) {
      throw new Error("Follow activity missing actor field");
    }
    
    // Remove the follow relationship
    const { data, error } = await supabaseClient
      .from("actor_followers")
      .delete()
      .eq("local_actor_id", recipientId)
      .eq("follower_actor_url", followerActorUrl)
      .select();
    
    if (error) {
      throw error;
    }
    
    if (data && data.length > 0) {
      console.log(`Removed follow relationship for ${followerActorUrl}`);
      
      // Update follower count
      await supabaseClient
        .from("actors")
        .update({ 
          follower_count: supabaseClient.raw('follower_count - 1') 
        })
        .eq("id", recipientId);
    } else {
      console.log(`No follow relationship found for ${followerActorUrl}`);
    }
  } catch (error) {
    console.error("Error handling Unfollow activity:", error);
    throw error;
  }
}

async function handleCreateActivity(activity: any, recipientId: string, sender: string) {
  try {
    console.log(`Processing Create activity from ${sender}`);
    
    // Extract the created object
    const object = activity.object;
    if (!object) {
      throw new Error("Create activity missing object");
    }
    
    // Store the object in the inbox_items table
    const { data, error } = await supabaseClient
      .from("inbox_items")
      .insert({
        recipient_id: recipientId,
        sender: sender,
        activity_type: activity.type,
        object_type: object.type,
        content: activity
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`Stored inbox item: ${data.id}`);
  } catch (error) {
    console.error("Error handling Create activity:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    if (pathParts.length !== 1) {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const username = pathParts[0];
    
    // Look up the actor
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Look up the actor
    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("id, user_id")
      .eq("user_id", profile.id)
      .single();

    if (actorError || !actor) {
      return new Response(
        JSON.stringify({ error: "Actor not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Parse the activity
    let activity;
    try {
      activity = await req.json();
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Validate the activity
    if (!activity.type || !activity.actor) {
      return new Response(
        JSON.stringify({ error: "Invalid activity" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Process the activity based on its type
    const sender = activity.actor;
    
    switch (activity.type) {
      case "Follow":
        await handleFollowActivity(activity, actor.id, sender);
        break;
      case "Undo":
        await handleUndoActivity(activity, actor.id, sender);
        break;
      case "Create":
        await handleCreateActivity(activity, actor.id, sender);
        break;
      default:
        console.log(`Unsupported activity type: ${activity.type}`);
        // Store unsupported activities for future reference
        await supabaseClient
          .from("inbox_items")
          .insert({
            recipient_id: actor.id,
            sender: sender,
            activity_type: activity.type,
            content: activity
          });
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing inbox request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
