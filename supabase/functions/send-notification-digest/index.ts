import { workerHandler } from "../_shared/user-auth.ts";
import { jsonResponse } from "../_shared/local-actor.ts";
import { getSiteUrl } from "../_shared/federation-urls.ts";
import { createClient } from "npm:@supabase/supabase-js@2.117.2";
import { sendEmail } from "../_shared/email.ts";
import { digestOptions, runDigest } from "./handler.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
});

const must = <T>({ data, error }: { data: T; error: unknown }) => { if (error) throw new Error("Database request failed"); return data; };

Deno.serve(workerHandler(async (req) => {
  const options = await digestOptions(req);
  if (!options) return jsonResponse({ error: "Body must be empty or {\"dryRun\": boolean}" }, 400);
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!options.dryRun && !apiKey) return jsonResponse({ error: "Email delivery is not configured" }, 503);

  const result = await runDigest({
    now: () => Date.now(),
    siteUrl: getSiteUrl(),
    fromEmail: Deno.env.get("RESEND_FROM_EMAIL") || "Nolto <noreply@nolto.social>",
    candidateUserIds: async cutoff => (must(await supabase.from("notifications").select("recipient_id")
      .eq("read", false).lt("created_at", cutoff).limit(5000)) ?? []).map((n: { recipient_id: string }) => n.recipient_id),
    profile: async id => must(await supabase.from("profiles").select("email_digest_enabled, deleted_at").eq("id", id).maybeSingle()),
    authUser: async id => {
      const { data, error } = await supabase.auth.admin.getUserById(id);
      if (error) { if ((error as { status?: number }).status === 404) return null; throw new Error("Auth lookup failed"); }
      return data.user ? { email: data.user.email, email_confirmed_at: data.user.email_confirmed_at, banned_until: (data.user as { banned_until?: string }).banned_until } : null;
    },
    tracking: async id => must(await supabase.from("notification_digest_tracking")
      .select("last_digest_sent_at, last_digest_watermark, claim_token, claimed_at, last_failure_at, failure_count").eq("user_id", id).maybeSingle()),
    unread: async (id, limit) => must(await supabase.from("notifications").select("id, type, content, created_at, actor_id")
      .eq("recipient_id", id).eq("read", false).order("created_at", { ascending: false }).limit(limit)) ?? [],
    actorNames: async ids => {
      const map = new Map<string, string>();
      if (!ids.length) return map;
      const rows = must(await supabase.from("public_profiles").select("id, fullname, username").in("id", ids)) ?? [];
      for (const p of rows as { id: string; fullname: string | null; username: string | null }[]) map.set(p.id, p.fullname || p.username || "Someone");
      return map;
    },
    claim: async (id, claim) => {
      const rows = must(await supabase.rpc("claim_notification_digest", { _user_id: id, _claim: claim })) as { claimed: boolean; watermark: string | null }[] | null;
      return rows?.[0] ?? { claimed: false, watermark: null };
    },
    finish: async (id, claim, sent, watermark) => must(await supabase.rpc("finish_notification_digest", { _user_id: id, _claim: claim, _sent: sent, _watermark: watermark })) === true,
    send: (message, idempotencyKey) => sendEmail(apiKey!, message, { idempotencyKey }),
    newClaim: () => crypto.randomUUID(),
    log: (level, message) => console[level](`[send-notification-digest] ${message}`),
  }, options);
  return jsonResponse(result);
}));
