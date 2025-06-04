
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signedFetch } from "./utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const { limit = 10 } = await req.json();
    
    // Get pending federation queue items
    const { data: queueItems, error } = await supabaseClient
      .from("federation_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    
    if (error) {
      throw error;
    }
    
    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending federation items" }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    console.log(`Processing ${queueItems.length} federation items`);
    
    // Process each item
    const results = [];
    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabaseClient
          .from("federation_queue")
          .update({ status: "processing" })
          .eq("id", item.id);
        
        const activity = item.activity;
        const actorId = item.actor_id;
        
        let recipients = [];
        
        // Handle Accept activities specially
        if (activity.type === "Accept" && activity.object?.type === "Follow") {
          // For Accept activities, the recipient is the original follower
          const followerActorUrl = activity.object.actor;
          if (followerActorUrl) {
            recipients.push(followerActorUrl);
            console.log(`Accept activity targeting follower: ${followerActorUrl}`);
          }
        } else if (activity.to) {
          // Handle activities with explicit 'to' field
          const toField = Array.isArray(activity.to) ? activity.to : [activity.to];
          recipients.push(...toField.filter(to => 
            typeof to === 'string' && 
            to !== 'https://www.w3.org/ns/activitystreams#Public'
          ));
        } else {
          // Default behavior: send to followers
          const { data: followers, error: followersError } = await supabaseClient
            .from("user_connections")
            .select(`
              connected_user_id,
              profiles!user_connections_connected_user_id_fkey(username)
            `)
            .eq("user_id", actorId)
            .eq("status", "accepted");
          
          if (followersError) {
            console.error("Error fetching followers:", followersError);
            continue;
          }
          
          // Convert followers to actor URIs
          for (const follower of followers || []) {
            const followerUsername = follower.profiles?.username;
            if (followerUsername) {
              const supabaseUrl = Deno.env.get("SUPABASE_URL");
              recipients.push(`${supabaseUrl}/functions/v1/actor/${followerUsername}`);
            }
          }
        }
        
        console.log(`Activity ${item.id} has ${recipients.length} recipients`);
        
        // Send to each recipient's inbox
        for (const recipientUri of recipients) {
          try {
            console.log(`Determining inbox for recipient: ${recipientUri}`);
            
            // For local actors, construct inbox URL directly
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            let inboxUrl;
            
            if (recipientUri.startsWith(supabaseUrl)) {
              // Local actor
              const username = recipientUri.split('/').pop();
              inboxUrl = `${supabaseUrl}/functions/v1/inbox/${username}`;
            } else {
              // Remote actor - would need to fetch their actor document
              // For now, assume inbox follows convention
              inboxUrl = `${recipientUri}/inbox`;
            }
            
            console.log(`Sending activity to ${inboxUrl}`);
            
            // Use signed fetch to send the activity
            const response = await signedFetch(inboxUrl, {
              method: "POST",
              body: JSON.stringify(activity),
              headers: {
                "Content-Type": "application/activity+json",
                "Accept": "application/activity+json"
              }
            }, actorId);
            
            if (!response.ok) {
              console.error(`Failed to deliver to ${inboxUrl}: ${response.status}`);
            } else {
              console.log(`Successfully delivered to ${inboxUrl}`);
            }
            
          } catch (deliveryError) {
            console.error("Error delivering to recipient:", deliveryError);
          }
        }
        
        // Mark as processed
        await supabaseClient
          .from("federation_queue")
          .update({ status: "processed" })
          .eq("id", item.id);
        
        results.push({ id: item.id, success: true });
        
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        
        // Mark as failed
        await supabaseClient
          .from("federation_queue")
          .update({ status: "failed" })
          .eq("id", item.id);
        
        results.push({ id: item.id, success: false, error: itemError.message });
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }), 
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error in federation processor:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Error processing federation queue", 
        details: error.message 
      }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
