
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache (replaces unsupported Deno.openKv)
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Initialize the Supabase client
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function getCached(key: string): unknown | null {
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data;
  }
  memoryCache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  memoryCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle discovery endpoint - returns links to nodeinfo schemas
    // This handles both /.well-known/nodeinfo (if proxied) and /nodeinfo (direct call)
    if (path === "/.well-known/nodeinfo" || path === "/nodeinfo" || path === "/") {
      const siteUrl = Deno.env.get("SITE_URL") || "https://nolto.social";
      const baseUrl = siteUrl.replace(/\/$/, "");
      
      const discoveryDocument = {
        links: [
          {
            rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
            href: `${baseUrl}/functions/v1/nodeinfo/2.0`
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
    // Handle the actual NodeInfo 2.0 document
    else if (path === "/nodeinfo/2.0" || path === "/2.0") {
      // Try to get from cache first
      const cacheKey = "nodeinfo_2.0";
      const cachedData = getCached(cacheKey);
      
      if (cachedData) {
        console.log(`Cache hit for NodeInfo 2.0`);
        return new Response(
          JSON.stringify(cachedData),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json; profile=http://nodeinfo.diaspora.software/ns/schema/2.0#" }
          }
        );
      }

      console.log(`Cache miss for NodeInfo 2.0, fetching from database`);

      // Get usage statistics
      const { count: userCount } = await supabaseClient
        .from("profiles")
        .select("id", { count: 'exact', head: true });

      const { count: postCount } = await supabaseClient
        .from("ap_objects")
        .select("id", { count: 'exact', head: true })
        .eq("type", "Note");

      // Build the NodeInfo 2.0 response
      const nodeInfo = {
        version: "2.0",
        software: {
          name: "nolto",
          version: "1.0.0"
        },
        protocols: ["activitypub"],
        usage: {
          users: {
            total: userCount || 0,
            activeMonth: userCount || 0,
            activeHalfyear: userCount || 0
          },
          localPosts: postCount || 0
        },
        openRegistrations: true,
        metadata: {
          nodeName: "Nolto Social",
          nodeDescription: "A federated professional networking platform"
        }
      };

      // Store in cache
      setCache(cacheKey, nodeInfo);

      return new Response(
        JSON.stringify(nodeInfo),
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
