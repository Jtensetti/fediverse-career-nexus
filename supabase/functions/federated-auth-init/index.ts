import { serviceClient, jsonResponse, federationHeaders } from "../_shared/local-actor.ts";
import { getSiteUrl } from "../_shared/federation-urls.ts";
import { remoteUrl, remoteFetch, readJson } from "../_shared/remote-fetch.ts";
import { OAUTH_SCOPES, randomToken, tokenHash, pkceChallenge } from "../_shared/oauth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...federationHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const { handle, redirectUri, link = false } = await req.json();
    const callback = `${getSiteUrl()}/auth/callback`;
    if (redirectUri !== callback) return jsonResponse({ error: `Start sign-in at ${getSiteUrl()} to keep your session on the same site.` }, 400);
    const parsed = typeof handle === "string" ? /^@?([a-zA-Z0-9_]+)@([^\s/@]+)$/.exec(handle.trim()) : null;
    if (!parsed) return jsonResponse({ error: "Use username@server" }, 400);
    const username = parsed[1];
    const domain = remoteUrl(`https://${parsed[2]}`).hostname;
    const db = serviceClient();
    let linkUserId: string | null = null;
    if (link === true) {
      const token = req.headers.get("Authorization")?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return jsonResponse({ error: "Sign in to Nolto before linking an account" }, 401);
      const { data: { user }, error: authError } = await db.auth.getUser(token);
      if (authError || !user) return jsonResponse({ error: "Invalid Nolto session" }, 401);
      linkUserId = user.id;
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const { count, error: limitError } = await db.from("auth_request_logs").select("id", { count: "exact", head: true })
      .eq("ip", ip).eq("endpoint", "federated-auth").gte("timestamp", new Date(Date.now() - 60000).toISOString());
    if (limitError) throw limitError;
    if ((count || 0) >= 10) return jsonResponse({ error: "Too many sign-in attempts. Try again shortly." }, 429);
    await db.from("auth_request_logs").insert({ ip, endpoint: "federated-auth" });
    const { data: existing, error } = await db.from("oauth_clients").select("*").eq("instance_domain", domain).maybeSingle();
    if (error) throw error;
    let client = existing;
    if (!client || client.redirect_uri !== callback || client.scopes !== OAUTH_SCOPES) {
      const app = await readJson(await remoteFetch(`https://${domain}/api/v1/apps`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_name: "Nolto", redirect_uris: callback, scopes: OAUTH_SCOPES, website: getSiteUrl() }),
      }));
      if (!app.client_id || !app.client_secret) throw new Error("OAuth registration failed");
      const record = { instance_domain: domain, client_id: app.client_id, client_secret: app.client_secret, redirect_uri: callback, scopes: OAUTH_SCOPES };
      const { error: saveError } = await db.from("oauth_clients").upsert(record, { onConflict: "instance_domain" });
      if (saveError) throw saveError;
      client = record;
    }
    const state = randomToken();
    const verifier = randomToken();
    await db.from("federated_oauth_states").delete().lt("expires_at", new Date().toISOString());
    const { error: stateError } = await db.from("federated_oauth_states").insert({
      state_hash: await tokenHash(state), link_user_id: linkUserId, instance_domain: domain, redirect_uri: callback, code_verifier: verifier, username,
    });
    if (stateError) throw stateError;
    const authUrl = new URL(`https://${domain}/oauth/authorize`);
    for (const [key, value] of Object.entries({ client_id: client.client_id, scope: OAUTH_SCOPES,
      redirect_uri: callback, response_type: "code", state, code_challenge: await pkceChallenge(verifier), code_challenge_method: "S256" })) {
      authUrl.searchParams.set(key, value as string);
    }
    return jsonResponse({ authorizationUrl: authUrl.href, state, domain, username });
  } catch (error) {
    console.error("Federated sign-in could not start", error);
    return jsonResponse({ error: "Could not start sign-in. Check that the server supports the Mastodon OAuth API." }, 502);
  }
});
