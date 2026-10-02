import { ok as assert, deepStrictEqual as assertEquals } from "node:assert/strict";
import { deliverableEmail, digestOptions, runDigest, type DigestDeps, type DigestNotification, type DigestTracking } from "../functions/send-notification-digest/handler.ts";

const NOW = Date.parse("2026-10-02T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000).toISOString();

interface Fixture {
  users: Record<string, { profile?: { email_digest_enabled: boolean | null; deleted_at: string | null }; auth?: { email: string; email_confirmed_at: string | null; banned_until?: string | null }; notes: DigestNotification[] }>;
  sendFails?: boolean;
}

/** In-memory stand-in whose claim/finish mirror the SQL functions' conditions. */
function harness(f: Fixture) {
  const tracking = new Map<string, DigestTracking>();
  const sends: { to: string[]; key: string; html: string }[] = [];
  const logs: string[] = [];
  let seq = 0;
  const deps: DigestDeps = {
    now: () => NOW, siteUrl: "https://nolto.example", fromEmail: "Nolto <noreply@nolto.example>",
    candidateUserIds: async cutoff => Object.entries(f.users).flatMap(([id, u]) => u.notes.filter(n => n.created_at < cutoff).map(() => id)),
    profile: async id => f.users[id]?.profile ?? null,
    authUser: async id => f.users[id]?.auth ?? null,
    tracking: async id => tracking.get(id) ?? null,
    unread: async (id, limit) => [...f.users[id].notes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit),
    actorNames: async () => new Map([["actor", "<b>Ada</b>"]]),
    claim: async (id, claim) => {
      const t = tracking.get(id) ?? { last_digest_sent_at: null, last_digest_watermark: null, claim_token: null, claimed_at: null, last_failure_at: null, failure_count: 0 };
      tracking.set(id, t);
      const free = !t.claim_token || Date.parse(t.claimed_at!) < NOW - 15 * 60_000;
      const due = !t.last_digest_sent_at || Date.parse(t.last_digest_sent_at) < NOW - 36 * 3600_000;
      const backoff = !t.last_failure_at || Date.parse(t.last_failure_at) < NOW - Math.min(3600_000 * 2 ** Math.min(t.failure_count, 6), 48 * 3600_000);
      if (!(free && due && backoff)) return { claimed: false, watermark: null };
      t.claim_token = claim; t.claimed_at = new Date(NOW).toISOString();
      return { claimed: true, watermark: t.last_digest_watermark };
    },
    finish: async (id, claim, sent, watermark) => {
      const t = tracking.get(id);
      if (!t || t.claim_token !== claim) return false;
      t.claim_token = null; t.claimed_at = null;
      if (sent) { t.last_digest_sent_at = new Date(NOW).toISOString(); t.last_digest_watermark = watermark; t.failure_count = 0; t.last_failure_at = null; }
      else if (watermark) { t.last_failure_at = new Date(NOW).toISOString(); t.failure_count++; }
      return true;
    },
    send: async (message, key) => {
      await new Promise(r => setTimeout(r, 1));
      if (f.sendFails) throw new Error("provider 500");
      sends.push({ to: message.to, key, html: message.html });
    },
    newClaim: () => `claim-${++seq}`,
    log: (_l, m) => logs.push(m),
  };
  return { deps, tracking, sends, logs };
}

async function sendDigest(deps: DigestDeps) {
  const result = await runDigest(deps, { dryRun: false });
  assert("sent" in result && "failed" in result, "send mode returns delivery counts");
  return result;
}

const note = (id: string, h: number): DigestNotification => ({ id, type: "like", content: null, created_at: hoursAgo(h), actor_id: "actor" });
const opted = { email_digest_enabled: true, deleted_at: null };
const confirmed = (email: string) => ({ email, email_confirmed_at: hoursAgo(1000) });

Deno.test("digest: only confirmed Auth emails of active opted-in users receive mail", async () => {
  const h = harness({ users: {
    ok: { profile: opted, auth: confirmed("ada@mail.example.org"), notes: [note("1", 40)] },
    unconfirmed: { profile: opted, auth: { email: "x@mail.example.org", email_confirmed_at: null }, notes: [note("2", 40)] },
    federated: { profile: opted, auth: confirmed("u@remote.federated.local"), notes: [note("3", 40)] },
    optout: { profile: { email_digest_enabled: false, deleted_at: null }, auth: confirmed("o@mail.example.org"), notes: [note("4", 40)] },
    deleted: { profile: { email_digest_enabled: true, deleted_at: hoursAgo(1) }, auth: confirmed("d@mail.example.org"), notes: [note("5", 40)] },
    banned: { profile: opted, auth: { ...confirmed("b@mail.example.org"), banned_until: hoursAgo(-10) }, notes: [note("6", 40)] },
  } });
  const result = await sendDigest(h.deps);
  assertEquals(h.sends.map(s => s.to), [["ada@mail.example.org"]]);
  assertEquals(result.skipped, { unconfirmed_email: 1, undeliverable_email: 1, not_opted_in: 1, deleted: 1, banned: 1 });
  assert(!h.sends[0].html.includes("<b>Ada</b>"), "actor names are escaped");
});

Deno.test("digest: unchanged unread set is never re-sent, new old notification is", async () => {
  const f: Fixture = { users: { u: { profile: opted, auth: confirmed("u@mail.example.org"), notes: [note("1", 40)] } } };
  const h = harness(f);
  assertEquals((await sendDigest(h.deps)).sent, 1);
  // Pretend the 36h interval passed: the same unread set must not be mailed again.
  h.tracking.get("u")!.last_digest_sent_at = hoursAgo(100);
  const again = await sendDigest(h.deps);
  assertEquals([again.sent, again.skipped.no_new_notifications], [0, 1]);
  f.users.u.notes.push(note("2", 37));
  assertEquals((await sendDigest(h.deps)).sent, 1);
  assertEquals(h.sends.length, 2);
  assert(h.sends[0].key !== h.sends[1].key);
});

Deno.test("digest: concurrent invocations send once", async () => {
  const h = harness({ users: { u: { profile: opted, auth: confirmed("u@mail.example.org"), notes: [note("1", 40)] } } });
  const [a, b] = await Promise.all([sendDigest(h.deps), sendDigest(h.deps)]);
  assertEquals(h.sends.length, 1);
  assertEquals(a.sent! + b.sent!, 1);
});

Deno.test("digest: provider failure is recorded as failure, not sent, and backs off", async () => {
  const f: Fixture = { users: { u: { profile: opted, auth: confirmed("u@mail.example.org"), notes: [note("1", 40)] } }, sendFails: true };
  const h = harness(f);
  const result = await sendDigest(h.deps);
  assertEquals([result.sent, result.failed], [0, 1]);
  const t = h.tracking.get("u")!;
  assertEquals([t.last_digest_sent_at, t.last_digest_watermark, t.claim_token, t.failure_count], [null, null, null, 1]);
  f.sendFails = false;
  assertEquals((await sendDigest(h.deps)).skipped.not_due, 1, "retry waits for backoff");
  assert(!h.logs.some(l => l.includes("@")), "logs contain no addresses");
});

Deno.test("digest: dry run returns aggregates only and writes nothing", async () => {
  const h = harness({ users: {
    u: { profile: opted, auth: confirmed("u@mail.example.org"), notes: [note("1", 40)] },
    v: { profile: opted, auth: { email: "v@mail.example.org", email_confirmed_at: null }, notes: [note("2", 40)] },
  } });
  const result = await runDigest(h.deps, { dryRun: true });
  assertEquals(result, { success: true, dryRun: true, candidates: 2, wouldSend: 1, skipped: { unconfirmed_email: 1 } });
  assertEquals([h.sends.length, h.tracking.size], [0, 0]);
  assert(!JSON.stringify(result).includes("@"));
});

Deno.test("digest: email and body validation", async () => {
  for (const bad of ["", "nope", "a@localhost", "a@x.federated.local", "a@example.com", "a@b.invalid", "a b@c.org", null]) assert(!deliverableEmail(bad), String(bad));
  assert(deliverableEmail("jane@company.se"));
  const req = (body: string) => new Request("http://x", { method: "POST", body });
  assertEquals(await digestOptions(req("")), { dryRun: false });
  assertEquals(await digestOptions(req('{"dryRun":true}')), { dryRun: true });
  assertEquals(await digestOptions(req('{"dryRun":"yes"}')), null);
  assertEquals(await digestOptions(req("[]")), null);
});
