import { serviceClient, jsonResponse } from "../_shared/local-actor.ts";
import { z } from "npm:zod@3.25.76";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return jsonResponse({});
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);
  try {
    const parsed = z.object({ token: z.string().uuid() }).safeParse(await req.json());
    if (!parsed.success) return jsonResponse({ error: "Invalid token" }, 422);
    const db = serviceClient();
    const { data, error } = await db.from("email_verification_tokens").select("id,user_id,expires_at,used_at")
      .eq("token", parsed.data.token).maybeSingle();
    if (error) throw error;
    if (!data) return jsonResponse({ error: "Invalid token" }, 400);
    // A consumed confirmation remains successful on reload/React StrictMode. It grants no session.
    if (data.used_at) return jsonResponse({ success: true });
    if (new Date(data.expires_at) < new Date()) return jsonResponse({ error: "Token expired" }, 400);
    const { error: authError } = await db.auth.admin.updateUserById(data.user_id, { email_confirm: true });
    if (authError) throw authError;
    const { error: updateError } = await db.from("email_verification_tokens").update({ used_at: new Date().toISOString() }).eq("user_id", data.user_id);
    if (updateError) throw updateError;
    return jsonResponse({ success: true });
  } catch (error) {
    console.error("Email confirmation failed", error);
    return jsonResponse({ error: "Email confirmation failed. Please retry." }, 500);
  }
});
