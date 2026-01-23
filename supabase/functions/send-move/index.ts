import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { signRequest } from "../_shared/http-signature.ts";

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
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    const body = await req.json();
    const { new_account_url } = body;

    if (!new_account_url) {
      return new Response(
        JSON.stringify({ error: "new_account_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    try {
      new URL(new_account_url);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid new_account_url format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing Move request for user ${userId} to ${new_account_url}`);

    // Get local actor
    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (actorError || !actor) {
      return new Response(
        JSON.stringify({ error: "Actor not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get profile for username
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch new account to verify alsoKnownAs
    console.log(`Fetching new account ${new_account_url} for verification`);
    const newAccountResponse = await fetch(new_account_url, {
      headers: {
        "Accept": "application/activity+json, application/ld+json"
      }
    });

    if (!newAccountResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Could not fetch new account. Make sure it exists and is accessible." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newAccountData = await newAccountResponse.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const baseUrl = supabaseUrl.replace('/functions/v1', '');
    const localActorUrl = `${baseUrl}/${profile.username}`;

    // Verify alsoKnownAs on new account points to this account
    const alsoKnownAs = newAccountData.alsoKnownAs || [];
    if (!alsoKnownAs.includes(localActorUrl)) {
      return new Response(
        JSON.stringify({ 
          error: "Verification failed. The new account must list your Nolto account in its alsoKnownAs field.",
          expected: localActorUrl,
          found: alsoKnownAs
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update local actor with moved_to
    const { error: updateError } = await supabaseClient
      .from("actors")
      .update({ 
        moved_to: new_account_url,
        status: "moved"
      })
      .eq("id", actor.id);

    if (updateError) {
      throw updateError;
    }

    // Get all followers to notify
    const { data: followers, error: followersError } = await supabaseClient
      .from("actor_followers")
      .select("follower_actor_url")
      .eq("local_actor_id", actor.id)
      .eq("status", "accepted");

    if (followersError) {
      console.error("Error fetching followers:", followersError);
    }

    // Create Move activity
    const moveActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      "type": "Move",
      "id": `${supabaseUrl}/functions/v1/activities/${crypto.randomUUID()}`,
      "actor": localActorUrl,
      "object": localActorUrl,
      "target": new_account_url,
      "published": new Date().toISOString()
    };

    // Queue Move activity for each follower
    let queuedCount = 0;
    for (const follower of (followers || [])) {
      try {
        // Get follower's inbox
        const { data: cachedActor } = await supabaseClient
          .from("remote_actors_cache")
          .select("actor_data")
          .eq("actor_url", follower.follower_actor_url)
          .single();

        const inboxUrl = cachedActor?.actor_data?.inbox || `${follower.follower_actor_url}/inbox`;

        // Queue the activity
        await supabaseClient
          .from("federation_queue_partitioned")
          .insert({
            actor_id: actor.id,
            activity: moveActivity,
            target_inbox: inboxUrl,
            status: "pending",
            partition_key: Math.abs(actor.id.hashCode?.() || 0) % 16
          });

        queuedCount++;
      } catch (e) {
        console.error(`Error queueing Move for ${follower.follower_actor_url}:`, e);
      }
    }

    console.log(`Move activity queued for ${queuedCount} followers`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Account migration initiated",
        movedTo: new_account_url,
        followersNotified: queuedCount,
        note: "Your followers will be notified of your move. They will need to re-follow your new account."
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing Move request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
