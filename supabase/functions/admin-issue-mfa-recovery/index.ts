// Caller: src/components/moderation/MfaRecoveryQueue.tsx (admin only)
// Generates a single-use signed token, stores its hash, and emails a
// recovery link to the user's REGISTERED email (not the form email).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOKEN_TTL_MINUTES = 30;

function base64url(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Verify caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    const callerId = userData.user?.id;
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await admin.rpc("is_admin", {
      _user_id: callerId,
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id } = (await req.json().catch(() => ({}))) as {
      request_id?: string;
    };
    if (!request_id) {
      return new Response(JSON.stringify({ error: "Missing request_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load the request
    const { data: request, error: reqErr } = await admin
      .from("mfa_recovery_requests")
      .select("id, user_id, email, status")
      .eq("id", request_id)
      .single();

    if (reqErr || !request) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the actual user_id from registered email if not stored
    let userId = request.user_id as string | null;
    if (!userId) {
      // Look up by email via admin API (paged)
      const { data: list } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      const match = list?.users?.find(
        (u) => u.email?.toLowerCase() === request.email.toLowerCase(),
      );
      userId = match?.id ?? null;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "no_user_match" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get the registered email (always source of truth — not the form email)
    const { data: userInfo } = await admin.auth.admin.getUserById(userId);
    const registeredEmail = userInfo.user?.email;
    if (!registeredEmail) {
      return new Response(
        JSON.stringify({ error: "User has no email on file" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Generate token (32 bytes -> base64url)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = base64url(tokenBytes);
    const tokenHash = await sha256Hex(token);
    const expiresAt = new Date(
      Date.now() + TOKEN_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: insErr } = await admin.from("mfa_recovery_tokens").insert({
      user_id: userId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by_admin_id: callerId,
      request_id: request.id,
    });
    if (insErr) {
      console.error("Token insert failed:", insErr);
      return new Response(JSON.stringify({ error: "Could not create token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update request status
    await admin
      .from("mfa_recovery_requests")
      .update({
        status: "in_progress",
        handled_by: callerId,
        handled_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    // Send email (best-effort but report back if email truly fails)
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://www.samverkan.se";
    const link = `${siteUrl}/aterstall-mfa?token=${encodeURIComponent(token)}`;

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (resendKey && lovableKey) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
          <h2 style="color:#1a1a1a">Återställ tvåfaktorsautentisering</h2>
          <p>Hej,</p>
          <p>En administratör har initierat en återställning av tvåfaktorsautentisering för ditt Samverkan-konto.</p>
          <p>Klicka på knappen nedan inom <strong>30 minuter</strong>. Du kommer behöva logga in med ditt lösenord för att slutföra återställningen.</p>
          <p style="margin:24px 0">
            <a href="${escapeHtml(link)}"
               style="background:#1a1a1a;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">
              Återställ 2FA
            </a>
          </p>
          <p style="color:#666;font-size:13px">Eller kopiera länken: <br>${escapeHtml(link)}</p>
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
          <p style="color:#666;font-size:13px">
            <strong>Var detta inte du?</strong> Ignorera detta mail och kontakta support omedelbart på
            <a href="mailto:support@samverkan.se">support@samverkan.se</a>. Din MFA förblir aktiv tills länken används.
          </p>
        </div>
      `;

      const emailRes = await fetch(
        "https://connector-gateway.lovable.dev/resend/emails",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "Samverkan Support <noreply@samverkan.se>",
            to: [registeredEmail],
            subject: "Återställ tvåfaktorsautentisering på Samverkan",
            html,
          }),
        },
      );

      if (!emailRes.ok) {
        const txt = await emailRes.text();
        console.error("Email send failed:", emailRes.status, txt);
        return new Response(
          JSON.stringify({ error: "email_failed" }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    } else {
      console.warn("Email keys missing — token created but not emailed");
    }

    // Audit log
    await admin.from("moderation_actions").insert({
      type: "mfa_recovery_link_issued",
      target_user_id: userId,
      moderator_id: callerId,
      reason: `MFA recovery link issued for request ${request.id}`,
    });

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
