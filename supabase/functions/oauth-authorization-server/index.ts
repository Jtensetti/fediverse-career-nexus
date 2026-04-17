/**
 * OAuth Authorization Server discovery (RFC 8414).
 * Required for Mastodon-compatible clients (Tusky, Elk, Ivory, Phanpy)
 * to discover authentication endpoints automatically.
 *
 * Served at /.well-known/oauth-authorization-server via _redirects.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getFederationBaseUrl } from "../_shared/federation-urls.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const base = getFederationBaseUrl();
  const metadata = {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/oauth/token`,
    revocation_endpoint: `${base}/oauth/revoke`,
    registration_endpoint: `${base}/api/v1/apps`,
    scopes_supported: ["read", "write", "follow", "push", "profile"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "client_credentials"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    service_documentation: `${base}/help`,
    ui_locales_supported: ["sv", "en"],
    op_policy_uri: `${base}/legal/privacy`,
    op_tos_uri: `${base}/legal/terms`,
    app_registration: true,
  };

  return new Response(JSON.stringify(metadata, null, 2), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
