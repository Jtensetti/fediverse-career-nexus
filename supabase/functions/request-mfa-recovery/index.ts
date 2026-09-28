import { sendEmail } from "../_shared/email.ts";
// Caller: src/components/auth/MFARecoveryDialog.tsx
// Stores an MFA recovery request and notifies all admins via email.
import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RecoveryPayload {
  email?: string;
  username?: string;
  message?: string;
  attempted_login_email?: string;
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
    // Legacy client context only: this field is not proof of a login or password.
    const attemptedLoginEmailRaw = (body.attempted_login_email ?? "").trim().toLowerCase();
    const attemptedLoginEmail =
      attemptedLoginEmailRaw && isEmail(attemptedLoginEmailRaw)
        ? attemptedLoginEmailRaw
        : null;

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
        attempted_login_email: attemptedLoginEmail,
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

      if (adminEmails.length > 0 && resendKey) {
        const html = `
          <h2>New MFA recovery request</h2>
          <p><strong>Form email:</strong> ${escapeHtml(email)}</p>
          ${attemptedLoginEmail ? `<p><strong>User-supplied email context (unverified):</strong> ${escapeHtml(attemptedLoginEmail)}</p>` : ""}
          <p>Form details are unverified and do not prove a successful login or ownership of an account.</p>
          ${username ? `<p><strong>Username:</strong> ${escapeHtml(username)}</p>` : ""}
          ${message ? `<p><strong>Message:</strong></p><blockquote>${escapeHtml(message).replace(/\n/g, "<br>")}</blockquote>` : ""}
          <p><strong>Submitted:</strong> ${inserted.created_at}</p>
          <p><strong>Request ID:</strong> ${inserted.id}</p>
          <hr>
          <p>Review and respond in the moderation dashboard.</p>
        `;

        await sendEmail(resendKey, {
          from: "Nolto Support <noreply@nolto.social>", to: adminEmails, reply_to: email,
          subject: `[Nolto] MFA recovery request from ${email}`, html,
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
