
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
    // Try to get from cache first
    const cacheKey = "instance_metadata";
    const cachedData = getCached(cacheKey);
    
    if (cachedData) {
      console.log(`Cache hit for instance metadata`);
      return new Response(
        JSON.stringify(cachedData),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`Cache miss for instance metadata, fetching from database`);

    // Get current stats
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
      .not('remote_actor_url', 'is', null);

    const siteUrl = Deno.env.get("SITE_URL") || "https://nolto.social";

    // Build instance metadata (Mastodon-compatible format)
    const instanceData = {
      uri: siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      title: "Nolto Social",
      short_description: "A federated professional networking platform",
      description: "Nolto is an open, federated professional networking platform that connects with the Fediverse.",
      email: "admin@nolto.social",
      version: "1.0.0 (compatible; Nolto)",
      urls: {
        streaming_api: null
      },
      stats: {
        user_count: userCount || 0,
        status_count: statusCount || 0,
        domain_count: domainCount || 0
      },
      thumbnail: `${siteUrl}/og-image.png`,
      languages: ["en"],
      registrations: true,
      approval_required: false,
      invites_enabled: true,
      configuration: {
        statuses: {
          max_characters: 5000,
          max_media_attachments: 4
        },
        media_attachments: {
          supported_mime_types: ["image/jpeg", "image/png", "image/gif", "image/webp"],
          image_size_limit: 10485760
        }
      },
      contact_account: null,
      rules: []
    };

    // Store in cache
    setCache(cacheKey, instanceData);

    return new Response(
      JSON.stringify(instanceData),
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
