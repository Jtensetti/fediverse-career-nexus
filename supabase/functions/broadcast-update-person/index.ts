// One-off admin tool: broadcast `Update Person` for every local actor so remote
// instances invalidate their cached actor (and keyId) after a domain migration.
// Invoked manually by an admin via supabase.functions.invoke('broadcast-update-person').

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  buildActorUrl,
  buildActivityId,
  buildInboxUrl,
  buildOutboxUrl,
  buildFollowersUrl,
  buildFollowingUrl,
  buildKeyId,
  buildSharedInboxUrl,
} from "../_shared/federation-urls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Require an authenticated admin caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7));
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: user.id });
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: actors, error } = await supabase
    .from("actors")
    .select("id, preferred_username, public_key")
    .eq("is_remote", false);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let queued = 0;
  for (const actor of actors ?? []) {
    const username = actor.preferred_username;
    const actorUrl = buildActorUrl(username);
    const personObject = {
      "@context": ["https://www.w3.org/ns/activitystreams", "https://w3id.org/security/v1"],
      id: actorUrl,
      type: "Person",
      preferredUsername: username,
      inbox: buildInboxUrl(username),
      outbox: buildOutboxUrl(username),
      followers: buildFollowersUrl(username),
      following: buildFollowingUrl(username),
      endpoints: { sharedInbox: buildSharedInboxUrl() },
      publicKey: {
        id: buildKeyId(username),
        owner: actorUrl,
        publicKeyPem: actor.public_key ?? "",
      },
    };
    const updateActivity = {
      "@context": "https://www.w3.org/ns/activitystreams",
      id: buildActivityId(),
      type: "Update",
      actor: actorUrl,
      object: personObject,
      to: ["https://www.w3.org/ns/activitystreams#Public"],
      cc: [buildFollowersUrl(username)],
      published: new Date().toISOString(),
    };

    const { data: partKey } = await supabase.rpc("actor_id_to_partition_key", { actor_uuid: actor.id });
    const { error: qErr } = await supabase.from("federation_queue_partitioned").insert({
      actor_id: actor.id,
      activity: updateActivity,
      status: "pending",
      partition_key: typeof partKey === "number" ? partKey : 0,
      priority: 7,
    });
    if (!qErr) queued++;
  }

  return new Response(JSON.stringify({ queued, total: actors?.length ?? 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
