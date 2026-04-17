import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { signRequest, generateRsaKeyPair } from "./http-signature.ts";
import {
  buildActorUrl,
  buildActivityId,
  buildObjectId,
  buildOutboxUrl,
} from "../_shared/federation-urls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache (matches webfinger/instance/nodeinfo pattern; resets on cold start)
const memoryCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(key: string): any | null {
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;
  if (entry) memoryCache.delete(key);
  return null;
}

function cacheSet(key: string, data: any) {
  memoryCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function generateActivityId(_username: string, _actorId: string): string {
  return buildActivityId();
}

function generateObjectId(_username: string, _objectType: string): string {
  return buildObjectId();
}

function assignActivityIds(activity: any, username: string, actorId: string): any {
  const enrichedActivity = { ...activity };
  if (!enrichedActivity.id) enrichedActivity.id = generateActivityId(username, actorId);
  if (!enrichedActivity.published) enrichedActivity.published = new Date().toISOString();

  if (enrichedActivity.object && typeof enrichedActivity.object === "object") {
    const obj = { ...enrichedActivity.object };
    if (!obj.id) obj.id = generateObjectId(username, obj.type || "Object");
    if (!obj.published) obj.published = new Date().toISOString();
    if (!obj.attributedTo) obj.attributedTo = buildActorUrl(username);
    enrichedActivity.object = obj;
  }
  return enrichedActivity;
}

const objectSchema = z.object({
  type: z.string(),
  id: z.string().url().optional(),
}).passthrough();

const activitySchema = z.object({
  "@context": z.any().optional(),
  type: z.string(),
  actor: z.string().url().optional(),
  object: objectSchema,
  to: z.union([z.array(z.string()), z.string()]).optional(),
  cc: z.union([z.array(z.string()), z.string()]).optional(),
  published: z.string().optional(),
  id: z.string().optional(),
}).passthrough();

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts.length !== 1) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const username = pathParts[0];

    const { data: profile, error: profileError } = await supabaseClient
      .from("public_profiles")
      .select("id, username")
      .eq("username", username)
      .single();
    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("id, user_id")
      .eq("user_id", profile.id)
      .single();
    if (actorError || !actor) {
      return new Response(JSON.stringify({ error: "Actor not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") return await handleGetOutbox(req, actor.id, profile.username);
    if (req.method === "POST") return await handlePostOutbox(req, actor.id, profile.username);

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing outbox request:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGetOutbox(req: Request, actorId: string, username: string): Promise<Response> {
  const url = new URL(req.url);
  const page = url.searchParams.get("page");
  if (!page) return await getOutboxCollection(actorId, username);
  return await getOutboxPage(actorId, username, page);
}

async function getOutboxCollection(actorId: string, username: string): Promise<Response> {
  const cacheKey = `outbox:${actorId}:collection`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { ...corsHeaders, "Content-Type": "application/activity+json" },
    });
  }

  const { count, error: countError } = await supabaseClient
    .from("ap_objects")
    .select("*", { count: "exact", head: true })
    .eq("attributed_to", actorId)
    .in("type", ["Note", "Article"]);

  if (countError) {
    console.error("Error counting activities:", countError);
    return new Response(JSON.stringify({ error: "Error retrieving activities" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const outboxUrl = buildOutboxUrl(username);
  const outboxCollection = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: outboxUrl,
    type: "OrderedCollection",
    totalItems: count || 0,
    first: `${outboxUrl}?page=1`,
    last: `${outboxUrl}?page=${Math.ceil((count || 0) / 20) || 1}`,
  };

  cacheSet(cacheKey, outboxCollection);
  return new Response(JSON.stringify(outboxCollection), {
    headers: { ...corsHeaders, "Content-Type": "application/activity+json" },
  });
}

/** Wrap a stored Note/Article object as a Create activity for outbox publication. */
function wrapAsCreate(obj: any, username: string): any {
  const actorUrl = buildActorUrl(username);
  // If the stored object is already an activity (Create/Announce/...), return as-is.
  if (obj && typeof obj === "object" && (obj.type === "Create" || obj.type === "Announce")) {
    return obj;
  }
  return {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: obj?.id ? `${obj.id}/activity` : buildActivityId(),
    type: "Create",
    actor: actorUrl,
    published: obj?.published || new Date().toISOString(),
    to: obj?.to || ["https://www.w3.org/ns/activitystreams#Public"],
    cc: obj?.cc || [],
    object: obj,
  };
}

async function getOutboxPage(actorId: string, username: string, page: string): Promise<Response> {
  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return new Response(JSON.stringify({ error: "Invalid page number" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pageSize = 20;
  const offset = (pageNum - 1) * pageSize;
  const cacheKey = `outbox:${actorId}:page:${pageNum}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      headers: { ...corsHeaders, "Content-Type": "application/activity+json" },
    });
  }

  const { data: objects, error } = await supabaseClient
    .from("ap_objects")
    .select("*")
    .eq("attributed_to", actorId)
    .in("type", ["Note", "Article"])
    .order("published_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    console.error("Error fetching outbox objects:", error);
    return new Response(JSON.stringify({ error: "Error retrieving activities" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Wrap each object in a Create activity (Mastodon expects Create/Note in orderedItems)
  const orderedItems = (objects || []).map((row) => wrapAsCreate(row.content, username));

  const outboxUrl = buildOutboxUrl(username);
  const outboxPage: any = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `${outboxUrl}?page=${pageNum}`,
    type: "OrderedCollectionPage",
    partOf: outboxUrl,
    orderedItems,
  };

  if (pageNum > 1) outboxPage.prev = `${outboxUrl}?page=${pageNum - 1}`;

  const { count } = await supabaseClient
    .from("ap_objects")
    .select("*", { count: "exact", head: true })
    .eq("attributed_to", actorId)
    .in("type", ["Note", "Article"]);

  if (count && count > offset + pageSize) {
    outboxPage.next = `${outboxUrl}?page=${pageNum + 1}`;
  }

  cacheSet(cacheKey, outboxPage);
  return new Response(JSON.stringify(outboxPage), {
    headers: { ...corsHeaders, "Content-Type": "application/activity+json" },
  });
}

async function handlePostOutbox(req: Request, actorId: string, username: string): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const token = authHeader.substring(7);
  try {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: actor, error: actorError } = await supabaseClient
      .from("actors")
      .select("user_id")
      .eq("id", actorId)
      .single();
    if (actorError || !actor || actor.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const expectedActorUrl = buildActorUrl(username);

  let activity;
  try {
    const body = await req.json();
    const result = activitySchema.safeParse(body);
    if (!result.success) {
      return new Response(JSON.stringify({ error: "Invalid activity", details: result.error.issues }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    activity = result.data;
    if (activity.actor && activity.actor !== expectedActorUrl) {
      return new Response(JSON.stringify({ error: "Actor URL mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!activity.actor) activity.actor = expectedActorUrl;
    if (typeof activity.to === "string") activity.to = [activity.to];
    if (typeof activity.cc === "string") activity.cc = [activity.cc];
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON in request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const enrichedActivity = assignActivityIds(activity, username, actorId);

  // Atomic key generation via SQL function (prevents race condition across edge functions)
  const { data: actorData, error: actorErr } = await supabaseClient
    .from("actors")
    .select("id, private_key, public_key")
    .eq("id", actorId)
    .single();
  if (actorErr) {
    return new Response(JSON.stringify({ error: "Error retrieving actor data" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let privateKey = actorData.private_key;
  let publicKey = actorData.public_key;
  if (!privateKey || !publicKey) {
    const keyPair = await generateRsaKeyPair();
    const { data: ensured, error: ensureErr } = await supabaseClient.rpc("ensure_actor_keys", {
      actor_uuid: actorId,
      new_private_key: keyPair.privateKey,
      new_public_key: keyPair.publicKey,
    });
    if (ensureErr || !ensured || !ensured[0]) {
      console.error("ensure_actor_keys failed:", ensureErr);
      return new Response(JSON.stringify({ error: "Error generating keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    privateKey = ensured[0].private_key;
    publicKey = ensured[0].public_key;
  }

  // Persist the inner object so it appears in our outbox GET feed.
  // Notes get auto-queued by the `queue_post_for_federation` DB trigger; for
  // other types (Like, Announce, Follow, Update, Delete) we must enqueue here.
  const innerType = enrichedActivity.object?.type;
  const isNote = innerType === "Note";

  if (enrichedActivity.object && typeof enrichedActivity.object === "object") {
    try {
      await supabaseClient.from("ap_objects").insert({
        type: innerType || "Note",
        attributed_to: actorId,
        content: enrichedActivity.object,
        published_at: enrichedActivity.object.published || new Date().toISOString(),
      });
    } catch (e) {
      console.error("Error persisting outbound object:", e);
    }
  }

  // Federation queue insert for non-Note activities (Notes are handled by trigger).
  if (!isNote) {
    try {
      const { data: partKey } = await supabaseClient.rpc("actor_id_to_partition_key", { actor_uuid: actorId });
      await supabaseClient.from("federation_queue_partitioned").insert({
        actor_id: actorId,
        activity: enrichedActivity,
        status: "pending",
        partition_key: typeof partKey === "number" ? partKey : 0,
        priority: enrichedActivity.type === "Delete" ? 8 : 5,
      });
    } catch (e) {
      console.error("Error queueing C2S activity for federation:", e);
    }
  }

  // Invalidate caches
  memoryCache.delete(`outbox:${actorId}:collection`);
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`outbox:${actorId}:page:`)) memoryCache.delete(key);
  }

  return new Response(JSON.stringify(enrichedActivity), {
    status: 201,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/activity+json",
      Location: enrichedActivity.id,
    },
  });
}
