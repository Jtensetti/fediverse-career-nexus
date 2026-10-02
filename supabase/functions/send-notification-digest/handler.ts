/**
 * Notification digest worker. No side effects at import; index.ts wires real dependencies.
 * Recipients are only Auth-confirmed addresses of active, opted-in local users. Each user is
 * claimed in the database before sending, and a digest is sent only when it contains unread
 * notifications newer than the last delivered watermark.
 */

export interface DigestNotification { id: string; type: string; content: string | null; created_at: string; actor_id: string | null }
export interface DigestTracking { last_digest_sent_at: string | null; last_digest_watermark: string | null; claim_token: string | null; claimed_at: string | null; last_failure_at: string | null; failure_count: number }
export interface DigestDeps {
  now(): number;
  siteUrl: string;
  fromEmail: string;
  candidateUserIds(olderThanIso: string): Promise<string[]>;
  profile(userId: string): Promise<{ email_digest_enabled: boolean | null; deleted_at: string | null } | null>;
  authUser(userId: string): Promise<{ email?: string | null; email_confirmed_at?: string | null; banned_until?: string | null } | null>;
  tracking(userId: string): Promise<DigestTracking | null>;
  unread(userId: string, limit: number): Promise<DigestNotification[]>;
  actorNames(actorIds: string[]): Promise<Map<string, string>>;
  claim(userId: string, claim: string): Promise<{ claimed: boolean; watermark: string | null }>;
  finish(userId: string, claim: string, sent: boolean, watermark: string | null): Promise<boolean>;
  send(message: { from: string; to: string[]; subject: string; html: string }, idempotencyKey: string): Promise<void>;
  newClaim(): string;
  log(level: "info" | "error", message: string, fields?: Record<string, unknown>): void;
}

const HOUR = 3600_000;
const DIGEST_INTERVAL = 36 * HOUR;
const CLAIM_TTL = 15 * 60_000;
const SYNTHETIC = /(\.federated\.local|\.local|\.localhost|\.invalid|\.test|\.example|\.internal)$|^(example\.(com|org|net)|localhost)$/i;

/** Only a syntactically ordinary, real-looking Auth address is deliverable. */
export function deliverableEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string" || email.length > 254) return false;
  const match = /^[^\s@]+@([a-z0-9-]+(\.[a-z0-9-]+)+)$/i.exec(email);
  return !!match && !SYNTHETIC.test(match[1]);
}

const failureBackoff = (count: number) => Math.min(HOUR * 2 ** Math.min(count, 6), 48 * HOUR);

type Reason = "no_profile" | "deleted" | "not_opted_in" | "no_auth_user" | "unconfirmed_email" | "undeliverable_email" | "banned"
  | "recently_sent" | "in_progress" | "failure_backoff" | "no_new_notifications" | "claim_lost" | "lookup_failed";

export async function runDigest(deps: DigestDeps, options: { dryRun: boolean }) {
  const now = deps.now();
  const cutoff = new Date(now - DIGEST_INTERVAL).toISOString();
  const skipped: Partial<Record<Reason, number>> = {};
  const skip = (reason: Reason) => { skipped[reason] = (skipped[reason] ?? 0) + 1; };
  let wouldSend = 0, sent = 0, failed = 0;

  const userIds = [...new Set(await deps.candidateUserIds(cutoff))];
  for (const userId of userIds) {
    let recipient: string;
    try {
      const profile = await deps.profile(userId);
      if (!profile) { skip("no_profile"); continue; }
      if (profile.deleted_at) { skip("deleted"); continue; }
      if (profile.email_digest_enabled !== true) { skip("not_opted_in"); continue; }
      const user = await deps.authUser(userId);
      if (!user) { skip("no_auth_user"); continue; }
      if (user.banned_until && Date.parse(user.banned_until) > now) { skip("banned"); continue; }
      if (!user.email_confirmed_at) { skip("unconfirmed_email"); continue; }
      if (!deliverableEmail(user.email)) { skip("undeliverable_email"); continue; }
      recipient = user.email!;
    } catch { skip("lookup_failed"); continue; }

    if (options.dryRun) {
      try {
        const t = await deps.tracking(userId);
        if (t?.claim_token && t.claimed_at && Date.parse(t.claimed_at) > now - CLAIM_TTL) { skip("in_progress"); continue; }
        if (t?.last_digest_sent_at && Date.parse(t.last_digest_sent_at) > now - DIGEST_INTERVAL) { skip("recently_sent"); continue; }
        if (t?.last_failure_at && Date.parse(t.last_failure_at) > now - failureBackoff(t.failure_count)) { skip("failure_backoff"); continue; }
        const items = await deps.unread(userId, 10);
        if (!hasNewOldItem(items, t?.last_digest_watermark ?? null, cutoff)) { skip("no_new_notifications"); continue; }
        wouldSend++;
      } catch { skip("lookup_failed"); }
      continue;
    }

    const claim = deps.newClaim();
    let watermark: string | null = null;
    try {
      const result = await deps.claim(userId, claim);
      if (!result.claimed) { skip("recently_sent"); continue; }
      const items = await deps.unread(userId, 10);
      if (!hasNewOldItem(items, result.watermark, cutoff)) {
        await deps.finish(userId, claim, false, null);
        skip("no_new_notifications");
        continue;
      }
      watermark = items.reduce((max, n) => n.created_at > max ? n.created_at : max, items[0].created_at);
      const names = await deps.actorNames([...new Set(items.map(n => n.actor_id).filter((id): id is string => !!id))]);
      const message = buildDigestEmail(items, names, deps.siteUrl, now);
      await deps.send({ from: deps.fromEmail, to: [recipient], ...message }, `notification-digest/${userId}/${watermark}`);
    } catch {
      failed++;
      deps.log("error", "Digest delivery failed");
      // Record a failure (never success); the claim is released so a later run can retry after backoff.
      try { await deps.finish(userId, claim, false, watermark ?? new Date(now).toISOString()); } catch { /* claim expires */ }
      continue;
    }
    sent++;
    try {
      if (!(await deps.finish(userId, claim, true, watermark))) skip("claim_lost");
    } catch {
      // Delivery succeeded; the claim stays until it expires and the retry reuses the same idempotency key.
      deps.log("error", "Digest tracking update failed after delivery");
    }
  }
  return { success: true, dryRun: options.dryRun, candidates: userIds.length, ...(options.dryRun ? { wouldSend } : { sent, failed }), skipped };
}

function hasNewOldItem(items: DigestNotification[], watermark: string | null, cutoff: string) {
  return items.some(n => n.created_at < cutoff && (!watermark || Date.parse(n.created_at) > Date.parse(watermark)));
}

const DESCRIPTIONS: Record<string, string> = {
  connection_request: "sent you a connection request", connection_accepted: "accepted your connection request",
  message: "sent you a message", message_reaction: "reacted to your message", follow: "started following you",
  like: "liked your post", boost: "boosted your post", reply: "replied to your post", mention: "mentioned you",
  recommendation_request: "requested a recommendation from you", recommendation_received: "wrote you a recommendation",
  article_published: "published a new article", job_application: "applied to your job posting",
};
const EMOJI: Record<string, string> = {
  connection_request: "👤", connection_accepted: "👤", follow: "👤", endorsement: "👍", message: "💬", message_reaction: "😊",
  like: "❤️", boost: "🔄", reply: "💭", mention: "@", recommendation_request: "📝", recommendation_received: "📝",
  article_published: "📰", job_application: "💼",
};
const describe = (type: string, content: string | null) => type === "endorsement" ? (content || "endorsed your skill") : DESCRIPTIONS[type] ?? "sent you a notification";

function escapeHtml(text: string) {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return text.replace(/[&<>"']/g, m => map[m]);
}

function timeAgo(date: number, now: number) {
  const s = Math.floor((now - date) / 1000);
  if (s < 60) return "Just now";
  const units: [number, string][] = [[604800, "week"], [86400, "day"], [3600, "hour"], [60, "minute"]];
  for (const [size, name] of units) if (s >= size) { const n = Math.floor(s / size); return `${n} ${name}${n > 1 ? "s" : ""} ago`; }
  return "Just now";
}

export function buildDigestEmail(items: DigestNotification[], names: Map<string, string>, siteUrl: string, now: number) {
  const rows = items.map(n => `
            <tr><td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
                <td width="40" style="vertical-align: top; padding-right: 12px;"><span style="font-size: 20px;">${EMOJI[n.type] ?? "🔔"}</span></td>
                <td style="vertical-align: top;">
                  <p style="margin: 0; font-size: 15px; color: #1a1a1a; line-height: 1.4;"><strong>${escapeHtml((n.actor_id && names.get(n.actor_id)) || "Someone")}</strong> ${escapeHtml(describe(n.type, n.content))}</p>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #6a6a6a;">${timeAgo(Date.parse(n.created_at), now)}</p>
                </td></tr></table>
            </td></tr>`).join("");
  const total = items.length;
  const plural = total > 1 ? "s" : "";
  const more = total >= 10 ? " (and possibly more)" : "";
  const site = escapeHtml(siteUrl);
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>You have notifications waiting</title></head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 40px 20px;"><tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
      <tr><td style="background-color: #1a1a1a; padding: 24px 32px;"><h1 style="margin: 0; font-size: 22px; font-weight: 600; color: #ffffff;">Nolto</h1></td></tr>
      <tr><td style="padding: 32px;">
        <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 600; color: #1a1a1a;">You have ${total} unread notification${plural}${more}</h2>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #6a6a6a; line-height: 1.5;">Here's what you've missed on Nolto:</p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">${rows}</table>
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 32px;"><tr><td align="center">
          <a href="${site}/notifications" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 500;">View your notifications</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding: 24px 32px; background-color: #fafafa; border-top: 1px solid #e5e5e5;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: #9a9a9a; text-align: center;">You're receiving this because you turned on email digests for unread notifications on Nolto.</p>
        <p style="margin: 0; font-size: 13px; color: #9a9a9a; text-align: center;"><a href="${site}/profile/edit" style="color: #6a6a6a; text-decoration: underline;">Manage email preferences</a></p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject: `You have ${total} unread notification${plural} on Nolto`, html };
}

/** Parses the optional worker body: only `{ "dryRun": true }` changes behavior. */
export async function digestOptions(req: Request) {
  const text = (await req.text()).slice(0, 4096).trim();
  if (!text) return { dryRun: false };
  let body: unknown;
  try { body = JSON.parse(text); } catch { return null; }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const dryRun = (body as Record<string, unknown>).dryRun;
  if (dryRun !== undefined && typeof dryRun !== "boolean") return null;
  return { dryRun: dryRun === true };
}
