// Caller: src/components/auth/MFARecoveryDialog.tsx
// Stores an MFA recovery request and notifies all admins via email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecoveryPayload {
  email?: string;
  username?: string;
  message?: string;
}

const isEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 320;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as RecoveryPayload;
    const email = (body.email ?? "").trim().toLowerCase();
    const username = (body.username ?? "").trim().slice(0, 120) || null;
    const message = (body.message ?? "").trim().slice(0, 2000) || null;

    if (!email || !isEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Try to identify caller (optional — they're often locked out)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("cf-connecting-ip") ??
      null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 500) ?? null;

    // Basic abuse guard: max 3 pending requests per email in last hour
    const { count } = await admin
      .from("mfa_recovery_requests")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if ((count ?? 0) >= 3) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please wait before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from("mfa_recovery_requests")
      .insert({
        user_id: userId,
        email,
        username,
        message,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      console.error("Failed to insert recovery request:", insertError);
      return new Response(
        JSON.stringify({ error: "Could not save your request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Notify admins by email (best-effort — don't fail the request if email fails)
    try {
      const { data: adminRoles } = await admin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = (adminRoles ?? []).map((r) => r.user_id);
      const adminEmails: string[] = [];

      for (const id of adminUserIds) {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data.user?.email) adminEmails.push(data.user.email);
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      const lovableKey = Deno.env.get("LOVABLE_API_KEY");

      if (adminEmails.length > 0 && resendKey && lovableKey) {
        const html = `
          <h2>New MFA recovery request</h2>
          <p><strong>From:</strong> ${escapeHtml(email)}</p>
          ${username ? `<p><strong>Username:</strong> ${escapeHtml(username)}</p>` : ""}
          ${message ? `<p><strong>Message:</strong></p><blockquote>${escapeHtml(message).replace(/\n/g, "<br>")}</blockquote>` : ""}
          <p><strong>Submitted:</strong> ${inserted.created_at}</p>
          <p><strong>Request ID:</strong> ${inserted.id}</p>
          <hr>
          <p>Review and respond in the moderation dashboard.</p>
        `;

        await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from: "Samverkan Support <noreply@samverkan.se>",
            to: adminEmails,
            reply_to: email,
            subject: `[Samverkan] MFA recovery request from ${email}`,
            html,
          }),
        });
      }
    } catch (notifyError) {
      console.error("Admin notification failed (non-fatal):", notifyError);
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
