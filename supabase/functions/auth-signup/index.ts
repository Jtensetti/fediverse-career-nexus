import { HttpError, requestBody } from "../_shared/user-auth.ts";
import { confirmationLink } from "../_shared/federation-urls.ts";
import { USERNAME_PATTERN, RESERVED_USERNAMES, escapeHtml } from "../_shared/actor-document.ts";
import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { sendEmail } from "../_shared/email.ts";
import { z } from "npm:zod@3.25.76";

const emailSchema = z.string().trim().toLowerCase().email().max(320);
const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(12).max(128),
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  username: z.string().trim().toLowerCase().regex(USERNAME_PATTERN).refine(name => !RESERVED_USERNAMES.has(name)),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse({});
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return jsonResponse({ error: "Email confirmation is temporarily unavailable" }, 503);
  const db = serviceClient();
  try {
    const body = await requestBody(req, 8192);
    const resend = body?.action === "resend";
    const parsed = (resend ? z.object({ email: emailSchema }) : signupSchema).safeParse(body);
    if (!parsed.success) return jsonResponse({ error: "Validation error" }, 422);
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const { count, error: rateError } = await db.from("auth_request_logs").select("*", { count: "exact", head: true })
      .eq("ip", ip).eq("endpoint", "signup").gte("timestamp", new Date(Date.now() - 60000).toISOString());
    if (rateError) throw rateError;
    if ((count || 0) >= 5) return jsonResponse({ error: "Too many requests. Please try again later." }, 429);
    const { error: logError } = await db.from("auth_request_logs").insert({ ip, endpoint: "signup" });
    if (logError) throw logError;

    let userId: string | undefined;
    if (!resend) {
      const { email, password, firstName, lastName, username } = signupSchema.parse(body);
      const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: false,
        user_metadata: { first_name: firstName, last_name: lastName, fullname: `${firstName} ${lastName}`, preferred_username: username } });
      if (error || !data.user) return jsonResponse({ error: error?.message || "Unable to create account" }, 400);
      userId = data.user.id;
    }

    // Service-only lookup, locked and throttled per account. Do not expose account existence on resend.
    const { data: token, error: tokenError } = await db.rpc("request_email_verification", { target_email: parsed.data.email });
    if (tokenError) throw tokenError;
    if (token) {
      const link = confirmationLink(req.headers.get("origin"), token);
      try {
        await sendEmail(apiKey, {
          from: "Nolto <noreply@nolto.social>", to: parsed.data.email, subject: "Confirm your Nolto account",
          text: `Confirm your email to get started on Nolto: ${link}\n\nThis link expires in 24 hours. If you did not request it, ignore this email.`,
          html: `<p>Confirm your email to get started on Nolto.</p><p><a href="${escapeHtml(link)}">Confirm email</a></p><p>This link expires in 24 hours. If you did not request it, ignore this email.</p>`,
        });
      } catch (error) {
        console.error("Confirmation email delivery failed", error);
        if (!resend) return jsonResponse({ success: true, userId, emailSent: false }, 202);
        // Keep the same resend response for unknown, confirmed and pending accounts.
      }
    }
    return jsonResponse(resend ? { success: true } : { success: true, userId, emailSent: true });
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    console.error("Email signup failed", error);
    return jsonResponse({ error: "Could not complete the request. Try resending the confirmation email." }, 500);
  }
});
