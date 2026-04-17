import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildFollowersUrl } from "../_shared/federation-urls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Accept both /<username>/followers and /functions/v1/followers/<username>
    const username = pathParts[pathParts.length - 1] === "followers"
      ? pathParts[pathParts.length - 2]
      : pathParts[pathParts.length - 1];

    if (!username) {
      return new Response(JSON.stringify({ error: "Invalid path" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id, preferred_username, status, follower_count")
      .eq("preferred_username", username)
      .single();
    if (actorError || !actor) {
      return new Response(JSON.stringify({ error: "Actor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (actor.status === "disabled") {
      return new Response(JSON.stringify({ error: "Federation disabled" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const page = parseInt(url.searchParams.get("page") || "0");
    const pageSize = 50;
    const collectionUrl = buildFollowersUrl(username);

    // Authoritative count from the followers table (status accepted)
    const { count: totalCount } = await supabase
      .from("actor_followers")
      .select("*", { count: "exact", head: true })
      .eq("local_actor_id", actor.id)
      .eq("status", "accepted");
    const totalItems = totalCount ?? actor.follower_count ?? 0;

    if (!page || page < 1) {
      // Collection metadata only — Mastodon-compatible
      return new Response(JSON.stringify({
        "@context": "https://www.w3.org/ns/activitystreams",
        id: collectionUrl,
        type: "OrderedCollection",
        totalItems,
        first: `${collectionUrl}?page=1`,
      }), { headers: { ...corsHeaders, "Content-Type": "application/activity+json" } });
    }

    const offset = (page - 1) * pageSize;
    const { data: followers, error: followersError } = await supabase
      .from("actor_followers")
      .select("follower_actor_url")
      .eq("local_actor_id", actor.id)
      .eq("status", "accepted")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (followersError) {
      return new Response(JSON.stringify({ error: "Failed to fetch followers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items = (followers || []).map((f) => f.follower_actor_url);
    const collection: any = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `${collectionUrl}?page=${page}`,
      type: "OrderedCollectionPage",
      partOf: collectionUrl,
      totalItems,
      orderedItems: items,
    };
    if (page > 1) collection.prev = `${collectionUrl}?page=${page - 1}`;
    if (items.length === pageSize) collection.next = `${collectionUrl}?page=${page + 1}`;

    return new Response(JSON.stringify(collection), {
      headers: { ...corsHeaders, "Content-Type": "application/activity+json" },
    });
  } catch (error) {
    console.error("Error processing followers request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
