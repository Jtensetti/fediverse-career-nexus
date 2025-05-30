
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    
    // Extract username from path: /username/following
    if (pathParts.length !== 2 || pathParts[1] !== "following") {
      return new Response(
        JSON.stringify({ error: "Invalid path" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const username = pathParts[0];
    const domain = url.hostname;
    const protocol = url.protocol;
    const baseUrl = `${protocol}//${domain}`;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the local actor
    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id, preferred_username, status")
      .eq("preferred_username", username)
      .single();

    if (actorError || !actor) {
      console.error("Actor not found:", actorError);
      return new Response(
        JSON.stringify({ error: "Actor not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Check if federation is disabled
    if (actor.status === "disabled") {
      return new Response(
        JSON.stringify({ error: "Federation disabled for this actor" }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Get pagination parameters
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    // For now, we'll look for Follow activities in the federation queue that were sent by this actor
    // In a more complete implementation, you might have a separate "following" table
    const { data: followingActivities, error: followingError } = await supabase
      .from("federation_queue")
      .select("activity")
      .eq("actor_id", actor.id)
      .eq("status", "processed")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (followingError) {
      console.error("Error fetching following:", followingError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch following" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Filter for Follow activities and extract the objects (who they're following)
    const followingUrls = followingActivities
      ?.filter(item => item.activity?.type === "Follow")
      .map(item => item.activity?.object)
      .filter(Boolean) || [];

    // Get total count of Follow activities for this actor
    const { count: totalFollowing, error: countError } = await supabase
      .from("federation_queue")
      .select("*", { count: "exact", head: true })
      .eq("actor_id", actor.id)
      .eq("status", "processed");

    const totalItems = totalFollowing || 0;
    const collectionUrl = `${baseUrl}/${username}/following`;

    // Create the collection response
    let collection;

    if (totalItems <= pageSize && page === 1) {
      // Simple collection for small lists
      collection = {
        "@context": "https://www.w3.org/ns/activitystreams",
        "type": "OrderedCollection",
        "id": collectionUrl,
        "totalItems": followingUrls.length,
        "orderedItems": followingUrls
      };
    } else {
      // Paginated collection
      const hasNext = followingUrls.length === pageSize;
      const hasPrev = page > 1;

      if (page === 1) {
        // First page - return collection with link to first page
        collection = {
          "@context": "https://www.w3.org/ns/activitystreams",
          "type": "OrderedCollection",
          "id": collectionUrl,
          "totalItems": totalItems,
          "first": `${collectionUrl}?page=1`
        };
      } else {
        // Subsequent pages - return collection page
        collection = {
          "@context": "https://www.w3.org/ns/activitystreams",
          "type": "OrderedCollectionPage",
          "id": `${collectionUrl}?page=${page}`,
          "partOf": collectionUrl,
          "orderedItems": followingUrls
        };

        if (hasPrev) {
          collection.prev = `${collectionUrl}?page=${page - 1}`;
        }
        if (hasNext) {
          collection.next = `${collectionUrl}?page=${page + 1}`;
        }
      }
    }

    return new Response(
      JSON.stringify(collection),
      {
        headers: { ...corsHeaders, "Content-Type": "application/activity+json" }
      }
    );

  } catch (error) {
    console.error("Error processing following request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
