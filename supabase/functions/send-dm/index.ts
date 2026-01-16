import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signedFetch } from "../_shared/http-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const senderId = user.id;

    // Parse request body
    const { recipientId, content, remoteActorUrl } = await req.json();

    if (!recipientId || !content) {
      return new Response(
        JSON.stringify({ error: "Missing recipientId or content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending DM from ${senderId} to ${recipientId} (remote: ${remoteActorUrl})`);

    // Get sender's actor info
    const { data: senderActor, error: senderError } = await supabaseClient
      .from("actors")
      .select("id, preferred_username, private_key, public_key")
      .eq("user_id", senderId)
      .eq("is_remote", false)
      .single();

    if (senderError || !senderActor) {
      return new Response(
        JSON.stringify({ error: "Sender actor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine recipient inbox
    let recipientInboxUrl: string;
    let recipientActorUrl = remoteActorUrl;

    if (remoteActorUrl) {
      // For federated users, fetch their inbox from their actor profile
      try {
        const actorResponse = await fetch(remoteActorUrl, {
          headers: { "Accept": "application/activity+json" }
        });
        
        if (!actorResponse.ok) {
          throw new Error(`Failed to fetch remote actor: ${actorResponse.status}`);
        }
        
        const actorData = await actorResponse.json();
        recipientInboxUrl = actorData.inbox;
        
        if (!recipientInboxUrl) {
          throw new Error("Remote actor has no inbox");
        }

        // Cache the actor data
        await supabaseClient
          .from("remote_actors_cache")
          .upsert({
            actor_url: remoteActorUrl,
            actor_data: actorData,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }, { onConflict: "actor_url" });

      } catch (fetchError) {
        console.error("Error fetching remote actor:", fetchError);
        return new Response(
          JSON.stringify({ error: "Failed to resolve remote recipient" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Non-federated messages should use direct insert" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the ActivityPub Create activity for a private Note (DM)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const activityId = crypto.randomUUID();
    const noteId = crypto.randomUUID();
    const senderActorUrl = `${supabaseUrl}/functions/v1/actor/${senderActor.preferred_username}`;

    const createActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "id": `${supabaseUrl}/functions/v1/activities/${activityId}`,
      "type": "Create",
      "actor": senderActorUrl,
      "published": new Date().toISOString(),
      "to": [recipientActorUrl],
      "cc": [],
      "object": {
        "@context": "https://www.w3.org/ns/activitystreams",
        "id": `${supabaseUrl}/functions/v1/notes/${noteId}`,
        "type": "Note",
        "attributedTo": senderActorUrl,
        "to": [recipientActorUrl],
        "cc": [],
        "content": content,
        "published": new Date().toISOString(),
        "sensitive": false,
        "tag": []
      }
    };

    console.log(`Sending DM activity to ${recipientInboxUrl}`);

    // Sign and send the activity
    try {
      const response = await signedFetch(
        recipientInboxUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/activity+json",
            "Accept": "application/activity+json"
          },
          body: JSON.stringify(createActivity)
        },
        senderActor.private_key,
        `${senderActorUrl}#main-key`
      );

      if (!response.ok && response.status !== 202) {
        const responseText = await response.text();
        console.error(`Federation delivery failed: ${response.status} - ${responseText}`);
        
        // Store message locally with failed status
        const { data: message, error: insertError } = await supabaseClient
          .from("messages")
          .insert({
            sender_id: senderId,
            recipient_id: recipientId,
            content: content,
            is_federated: true,
            federated_activity_id: activityId,
            remote_recipient_url: recipientActorUrl,
            delivery_status: "failed"
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error storing failed message:", insertError);
        }

        return new Response(
          JSON.stringify({ 
            error: "Failed to deliver message to remote server",
            message: message
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`DM delivered successfully to ${recipientInboxUrl}`);

      // Store message locally with delivered status
      const { data: message, error: insertError } = await supabaseClient
        .from("messages")
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content: content,
          is_federated: true,
          federated_activity_id: activityId,
          remote_recipient_url: recipientActorUrl,
          delivery_status: "delivered"
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error storing message:", insertError);
        return new Response(
          JSON.stringify({ error: "Message delivered but failed to store locally" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: message,
          delivery_status: "delivered"
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (deliveryError) {
      console.error("Error delivering DM:", deliveryError);
      
      // Store message with failed status
      const { data: message } = await supabaseClient
        .from("messages")
        .insert({
          sender_id: senderId,
          recipient_id: recipientId,
          content: content,
          is_federated: true,
          federated_activity_id: activityId,
          remote_recipient_url: recipientActorUrl,
          delivery_status: "failed"
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({ 
          error: "Failed to deliver message",
          message: message
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in send-dm:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
