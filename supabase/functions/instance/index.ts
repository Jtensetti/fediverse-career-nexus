
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize the Deno KV store for caching
const kv = await Deno.openKv();
const CACHE_NAMESPACE = "instance";
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
    // Try to get from cache first
    const cacheKey = [CACHE_NAMESPACE, "metadata"];
    const cachedResponse = await kv.get(cacheKey);
    
    if (cachedResponse.value) {
      console.log(`Cache hit for instance metadata`);
      return new Response(
        JSON.stringify(cachedResponse.value),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Cache miss for instance metadata, fetching from database`);

    // Get the instance data from the database
    const { data: instanceData, error } = await supabaseClient
      .from("ap_objects")
      .select("content")
      .eq("type", "Instance")
      .single();

    if (error || !instanceData) {
      console.error("Instance metadata not found:", error);
      return new Response(
        JSON.stringify({ error: "Instance metadata not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Update with current stats
    const { count: userCount } = await supabaseClient
      .from("profiles")
      .select("id", { count: 'exact', head: true });

    const { count: statusCount } = await supabaseClient
      .from("ap_objects")
      .select("id", { count: 'exact', head: true })
      .eq("type", "Note");

    const { count: domainCount } = await supabaseClient
      .from("actors")
      .select("id", { count: 'exact', head: true })
      .not('inbox_url', 'is', null);

    // Update the instance object with current stats
    const updatedInstanceData = {
      ...instanceData.content,
      stats: {
        user_count: userCount || 0,
        status_count: statusCount || 0,
        domain_count: domainCount || 0
      }
    };

    // Store updated instance data in cache
    await kv.set(cacheKey, updatedInstanceData, { expireIn: CACHE_TTL });

    return new Response(
      JSON.stringify(updatedInstanceData),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Error processing Instance metadata request:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
