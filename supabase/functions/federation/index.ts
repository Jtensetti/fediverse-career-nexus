
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
        
        // Get followers for this actor
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
        
        // Send to each follower's inbox
        for (const follower of followers || []) {
          try {
            const followerUsername = follower.profiles?.username;
            if (!followerUsername) continue;
            
            // In a real implementation, you'd resolve the actual inbox URL
            // For now, we'll construct it based on convention
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const inboxUrl = `${supabaseUrl}/functions/v1/inbox/${followerUsername}`;
            
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
            console.error("Error delivering to follower:", deliveryError);
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
