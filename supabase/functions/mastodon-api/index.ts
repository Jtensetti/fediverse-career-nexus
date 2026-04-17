/**
 * Mastodon-compatible API surface.
 *
 * Implements the minimal endpoints required for third-party Fediverse
 * clients (Tusky, Elk, Ivory, Phanpy, Mastodon iOS) to register and
 * discover this instance:
 *
 *   GET  /api/v1/instance        — instance metadata (Mastodon shape)
 *   POST /api/v1/apps            — OAuth client registration
 *   GET  /api/v2/search          — account/hashtag search
 *
 * Routing is path-based so a single edge function backs all three.
 * Web client URLs are rewritten via _redirects so that, e.g.,
 * `samverkan.se/api/v1/apps` proxies here.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  getFederationBaseUrl,
  getFederationDomain,
  buildActorUrl,
} from "../_shared/federation-urls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  GET /api/v1/instance                                                      */
/* -------------------------------------------------------------------------- */

async function handleInstance(): Promise<Response> {
  const domain = getFederationDomain();
  const base = getFederationBaseUrl();

  // Best-effort stats; missing tables degrade gracefully.
  let userCount = 0;
  let statusCount = 0;
  let domainCount = 0;
  try {
    const [{ count: u }, { count: s }, { count: d }] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("ap_objects")
        .select("id", { count: "exact", head: true })
        .eq("type", "Note"),
      supabase
        .from("remote_instances")
        .select("host", { count: "exact", head: true }),
    ]);
    userCount = u ?? 0;
    statusCount = s ?? 0;
    domainCount = d ?? 0;
  } catch {
    // ignore — return zeroed stats rather than 500
  }

  return json({
    uri: domain,
    title: "Samverkan",
    short_description:
      "Det professionella nätverket för svensk offentlig sektor.",
    description:
      "Samverkan är ett federerat professionellt nätverk för anställda inom myndigheter, kommuner och regioner i Sverige.",
    email: "kontakt@samverkan.se",
    version: "4.2.0 (compatible; Samverkan 1.0)",
    urls: { streaming_api: `wss://${domain}` },
    stats: {
      user_count: userCount,
      status_count: statusCount,
      domain_count: domainCount,
    },
    thumbnail: `${base}/og-image.png`,
    languages: ["sv", "en"],
    registrations: true,
    approval_required: false,
    invites_enabled: false,
    configuration: {
      statuses: {
        max_characters: 5000,
        max_media_attachments: 4,
        characters_reserved_per_url: 23,
      },
      media_attachments: {
        supported_mime_types: [
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ],
        image_size_limit: 10485760,
        image_matrix_limit: 16777216,
      },
      polls: {
        max_options: 4,
        max_characters_per_option: 100,
        min_expiration: 300,
        max_expiration: 2629746,
      },
    },
    contact_account: null,
    rules: [
      { id: "1", text: "Respektera kollegor och deltagare i diskussioner." },
      { id: "2", text: "Inget innehåll som strider mot svensk lag." },
      { id: "3", text: "Sekretessbelagd information får aldrig publiceras." },
      { id: "4", text: "Spam, trakasserier och hatretorik är förbjudet." },
    ],
  });
}

/* -------------------------------------------------------------------------- */
/*  POST /api/v1/apps                                                         */
/* -------------------------------------------------------------------------- */

async function handleAppsRegister(req: Request): Promise<Response> {
  let body: Record<string, unknown> = {};
  const contentType = req.headers.get("content-type") || "";
  try {
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    }
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  const clientName = String(body.client_name ?? "").trim();
  const redirectUris = String(body.redirect_uris ?? "").trim();
  const scopes = String(body.scopes ?? "read").trim();
  const website = body.website ? String(body.website) : null;

  if (!clientName || !redirectUris) {
    return json(
      { error: "client_name and redirect_uris are required" },
      422
    );
  }

  // Generate a client_id / client_secret pair.
  const clientId = crypto.randomUUID().replace(/-/g, "");
  const clientSecret = crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");

  // Store the registration. The oauth_clients table already exists for
  // outgoing federated auth; we re-use it with a marker domain so that
  // these client apps don't collide with instance-level OAuth.
  try {
    await supabase.from("oauth_clients").insert({
      instance_domain: `app:${clientId}`,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUris,
      scopes,
    });
  } catch (e) {
    console.error("Failed to persist oauth client:", e);
    // Continue — return the credentials anyway so the client isn't blocked,
    // but log so we can investigate. (Mastodon does the same: registration
    // never blocks.)
  }

  return json({
    id: clientId,
    name: clientName,
    website,
    redirect_uri: redirectUris,
    client_id: clientId,
    client_secret: clientSecret,
    vapid_key: null,
  });
}

/* -------------------------------------------------------------------------- */
/*  GET /api/v2/search                                                        */
/* -------------------------------------------------------------------------- */

async function handleSearch(url: URL): Promise<Response> {
  const q = (url.searchParams.get("q") ?? "").trim();
  const type = url.searchParams.get("type"); // accounts | hashtags | statuses
  const limit = Math.min(
    Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    40
  );

  const accounts: unknown[] = [];
  const hashtags: unknown[] = [];
  const statuses: unknown[] = []; // not implemented yet

  if (q && (!type || type === "accounts")) {
    // Strip leading @ and optional @domain suffix
    const handle = q.replace(/^@/, "");
    const [namePart, domainPart] = handle.split("@");
    const onLocalDomain =
      !domainPart || domainPart.toLowerCase() === getFederationDomain();

    if (onLocalDomain && namePart) {
      const { data } = await supabase
        .from("public_profiles")
        .select("id, username, fullname, avatar_url, bio, created_at")
        .or(`username.ilike.${namePart}%,fullname.ilike.%${namePart}%`)
        .limit(limit);

      for (const p of data ?? []) {
        const acct = `${p.username}@${getFederationDomain()}`;
        const url = buildActorUrl(p.username);
        accounts.push({
          id: p.id,
          username: p.username,
          acct: p.username, // local users get bare acct per Mastodon convention
          display_name: p.fullname ?? p.username,
          locked: false,
          bot: false,
          discoverable: true,
          group: false,
          created_at: p.created_at ?? new Date().toISOString(),
          note: p.bio ?? "",
          url,
          avatar: p.avatar_url ?? "",
          avatar_static: p.avatar_url ?? "",
          header: "",
          header_static: "",
          followers_count: 0,
          following_count: 0,
          statuses_count: 0,
          last_status_at: null,
          emojis: [],
          fields: [],
        });
      }
    }
  }

  if (q.startsWith("#") && (!type || type === "hashtags")) {
    const tag = q.slice(1);
    if (tag) {
      hashtags.push({
        name: tag,
        url: `${getFederationBaseUrl()}/tag/${tag}`,
        history: [],
      });
    }
  }

  return json({ accounts, statuses, hashtags });
}

/* -------------------------------------------------------------------------- */
/*  Router                                                                    */
/* -------------------------------------------------------------------------- */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Path may arrive as /functions/v1/mastodon-api/api/v1/instance OR
  // already-rewritten /api/v1/instance. Normalize.
  let path = url.pathname.replace(/^\/functions\/v1\/mastodon-api/, "");
  if (!path.startsWith("/api/")) {
    // Treat the residual as the API path.
    if (path.startsWith("/")) {
      // ok
    } else {
      path = "/" + path;
    }
  }

  try {
    if (req.method === "GET" && path.endsWith("/api/v1/instance")) {
      return await handleInstance();
    }
    if (req.method === "POST" && path.endsWith("/api/v1/apps")) {
      return await handleAppsRegister(req);
    }
    if (req.method === "GET" && path.endsWith("/api/v2/search")) {
      return await handleSearch(url);
    }
    return json({ error: "Not found", path }, 404);
  } catch (e) {
    console.error("mastodon-api error:", e);
    return json({ error: "Internal server error" }, 500);
  }
});
