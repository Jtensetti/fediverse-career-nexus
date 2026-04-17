// Caller: src/pages/auth/MfaRecover.tsx
// Validates a signed recovery token against the currently signed-in user
// and removes all MFA factors on success.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const userId = userData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "not_authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { token } = (await req.json().catch(() => ({}))) as {
      token?: string;
    };
    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenHash = await sha256Hex(token);

    const { data: tokenRow, error: tokenErr } = await admin
      .from("mfa_recovery_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRow.used_at) {
      return new Response(JSON.stringify({ error: "token_used" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "token_expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (tokenRow.user_id !== userId) {
      return new Response(JSON.stringify({ error: "wrong_user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Remove all MFA factors for the user
    const { data: factors } = await admin.auth.admin.mfa.listFactors({
      userId,
    });
    for (const f of factors?.factors ?? []) {
      await admin.auth.admin.mfa.deleteFactor({ userId, id: f.id });
    }

    // Mark token as used
    await admin
      .from("mfa_recovery_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", tokenRow.id);

    // Resolve any related request
    const { data: linkedReq } = await admin
      .from("mfa_recovery_tokens")
      .select("request_id")
      .eq("id", tokenRow.id)
      .single();

    if (linkedReq?.request_id) {
      await admin
        .from("mfa_recovery_requests")
        .update({
          status: "resolved",
          handled_at: new Date().toISOString(),
        })
        .eq("id", linkedReq.request_id);
    }

    // Audit log (use the token's admin issuer as moderator if known)
    const { data: tokenFull } = await admin
      .from("mfa_recovery_tokens")
      .select("created_by_admin_id")
      .eq("id", tokenRow.id)
      .single();

    if (tokenFull?.created_by_admin_id) {
      await admin.from("moderation_actions").insert({
        type: "mfa_factors_reset",
        target_user_id: userId,
        moderator_id: tokenFull.created_by_admin_id,
        reason: "User completed MFA recovery via signed link",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
