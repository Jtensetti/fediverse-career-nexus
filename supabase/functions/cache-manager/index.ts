import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    
    switch (action) {
      case "cleanup": {
        // Clean up expired cache entries
        const { data: deleted, error } = await supabaseClient
          .from("remote_actors_cache")
          .delete()
          .lt("expires_at", new Date().toISOString())
          .select("id");
        
        if (error) throw error;
        
        console.log(`Cleaned up ${deleted?.length || 0} expired cache entries`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            cleaned: deleted?.length || 0 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      case "prewarm": {
        // Pre-warm cache for popular actors (those with high hit counts)
        const { data: popularActors, error: fetchError } = await supabaseClient
          .from("remote_actors_cache")
          .select("actor_url, hit_count")
          .order("hit_count", { ascending: false })
          .limit(50);
        
        if (fetchError) throw fetchError;
        
        let refreshed = 0;
        for (const actor of popularActors || []) {
          try {
            const response = await fetch(actor.actor_url, {
              headers: {
                "Accept": "application/activity+json, application/ld+json",
                "User-Agent": "ActivityPub-CacheManager/1.0"
              }
            });
            
            if (response.ok) {
              const actorData = await response.json();
              
              await supabaseClient
                .from("remote_actors_cache")
                .upsert({
                  actor_url: actor.actor_url,
                  actor_data: actorData,
                  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                });
              
              refreshed++;
            }
          } catch (error) {
            console.error(`Failed to refresh cache for ${actor.actor_url}:`, error);
          }
        }
        
        console.log(`Pre-warmed ${refreshed} popular actor caches`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            refreshed,
            total: popularActors?.length || 0
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      case "stats": {
        // Get cache statistics
        const { data: stats, error } = await supabaseClient
          .from("remote_actors_cache")
          .select("id, hit_count, expires_at")
          .order("hit_count", { ascending: false });
        
        if (error) throw error;
        
        const now = new Date();
        const totalEntries = stats?.length || 0;
        const expiredEntries = stats?.filter(s => new Date(s.expires_at) < now).length || 0;
        const totalHits = stats?.reduce((sum, s) => sum + (s.hit_count || 0), 0) || 0;
        const avgHits = totalEntries > 0 ? totalHits / totalEntries : 0;
        
        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              totalEntries,
              expiredEntries,
              activeEntries: totalEntries - expiredEntries,
              totalHits,
              averageHitsPerEntry: avgHits.toFixed(2)
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      case "invalidate": {
        // Invalidate specific actor cache
        const url = new URL(req.url);
        const actorUrl = url.searchParams.get("actor_url");
        
        if (!actorUrl) {
          return new Response(
            JSON.stringify({ error: "actor_url parameter required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const { error } = await supabaseClient
          .from("remote_actors_cache")
          .delete()
          .eq("actor_url", actorUrl);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, invalidated: actorUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: "Unknown action. Use: cleanup, prewarm, stats, invalidate" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Cache manager error:", error);
    
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
