
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Deno KV store for caching
const kv = await Deno.openKv();
const CACHE_NAMESPACE = "nodeinfo";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

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
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle different nodeinfo related endpoints
    if (path === "/.well-known/nodeinfo") {
      // This is the discovery endpoint that points to the actual nodeinfo document
      const baseUrl = `${url.protocol}//${url.host}`;
      
      const discoveryDocument = {
        links: [
          {
            rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
            href: `${baseUrl}/nodeinfo/2.0`
          }
        ]
      };
      
      return new Response(
        JSON.stringify(discoveryDocument),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    } 
    else if (path === "/nodeinfo/2.0") {
      // Try to get from cache first
      const cacheKey = [CACHE_NAMESPACE, "2.0"];
      const cachedResponse = await kv.get(cacheKey);
      
      if (cachedResponse.value) {
        console.log(`Cache hit for NodeInfo 2.0`);
        return new Response(
          JSON.stringify(cachedResponse.value),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json; profile=http://nodeinfo.diaspora.software/ns/schema/2.0#" }
          }
        );
      }

      console.log(`Cache miss for NodeInfo 2.0, fetching from database`);

      // Get the nodeinfo data from the database
      const { data: nodeInfo, error } = await supabaseClient
        .from("ap_objects")
        .select("content")
        .eq("type", "NodeInfo")
        .single();

      if (error || !nodeInfo) {
        console.error("NodeInfo not found:", error);
        return new Response(
          JSON.stringify({ error: "NodeInfo not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Update usage statistics in the NodeInfo object
      const { count: userCount } = await supabaseClient
        .from("profiles")
        .select("id", { count: 'exact', head: true });

      const { count: postCount } = await supabaseClient
        .from("ap_objects")
        .select("id", { count: 'exact', head: true })
        .eq("type", "Note");

      // Update the nodeinfo object with current stats
      const updatedNodeInfo = {
        ...nodeInfo.content,
        usage: {
          ...nodeInfo.content.usage,
          users: {
            ...nodeInfo.content.usage.users,
            total: userCount || 0
          },
          localPosts: postCount || 0
        }
      };

      // Store updated nodeinfo in cache
      await kv.set(cacheKey, updatedNodeInfo, { expireIn: CACHE_TTL });

      return new Response(
        JSON.stringify(updatedNodeInfo),
        {
          headers: { 
            ...corsHeaders, 
            "Content-Type": "application/json; profile=http://nodeinfo.diaspora.software/ns/schema/2.0#" 
          }
        }
      );
    }
    else {
      return new Response(
        JSON.stringify({ error: "Not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
  } catch (error) {
    console.error("Error processing NodeInfo request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
