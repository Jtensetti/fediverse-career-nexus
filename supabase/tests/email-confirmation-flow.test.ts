// Runs the real auth-signup and auth-confirm-email handlers end to end against an
// in-memory fake of the backend client and email transport. No network, no real
// database, no real email. Token atomicity in SQL is covered separately by the
// isolated database tests; here the fake stores tokens the way the handlers use them.
import { strict as assert } from "node:assert";
import { createSignupHandler } from "../functions/auth-signup/handler.ts";
import { createConfirmHandler } from "../functions/auth-confirm-email/handler.ts";

const TOKEN = "3f1c6a52-8e4b-4d2a-9c71-0b5e9a7d2f10";
const EMAIL = "new.member@example.invalid";
const PASSWORD = "correct horse battery";

type Row = { id: string; user_id: string; token: string; expires_at: string; used_at: string | null };

function fakeBackend(opts: { rpcToken?: string | null; createError?: string; rateCount?: number } = {}) {
  const tokens: Row[] = [];
  const calls = { createUser: [] as unknown[], confirmUser: [] as unknown[], rpc: [] as unknown[], logs: 0 };
  const db = {
    from(table: string) {
      if (table === "auth_request_logs") {
        const q = { eq: () => q, gte: () => Promise.resolve({ count: opts.rateCount ?? 0, error: null }) };
        return { select: () => q, insert: () => { calls.logs++; return Promise.resolve({ error: null }); } };
      }
      if (table === "email_verification_tokens") {
        return {
          select: () => ({ eq: (_c: string, token: string) => ({ maybeSingle: () => {
            const row = tokens.find(r => r.token === token);
            return Promise.resolve({ data: row ? { ...row } : null, error: null });
          } }) }),
          update: (patch: Partial<Row>) => ({ eq: (_c: string, userId: string) => {
            tokens.filter(r => r.user_id === userId).forEach(r => Object.assign(r, patch));
            return Promise.resolve({ error: null });
          } }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
    rpc(name: string, args: unknown) {
      calls.rpc.push({ name, args });
      const token = opts.rpcToken === undefined ? TOKEN : opts.rpcToken;
      if (token) tokens.push({ id: crypto.randomUUID(), user_id: "u-1", token, expires_at: new Date(Date.now() + 864e5).toISOString(), used_at: null });
      return Promise.resolve({ data: token, error: null });
    },
    auth: { admin: {
      createUser: (input: unknown) => { calls.createUser.push(input);
        return Promise.resolve(opts.createError ? { data: { user: null }, error: { message: opts.createError } } : { data: { user: { id: "u-1" } }, error: null }); },
      updateUserById: (id: string, input: unknown) => { calls.confirmUser.push({ id, input }); return Promise.resolve({ error: null }); },
    } },
  };
  // deno-lint-ignore no-explicit-any
  return { db: db as any, tokens, calls };
}

function withEnv(env: Record<string, string | undefined>, run: () => Promise<void>) {
  return async () => {
    const previous = Object.fromEntries(Object.keys(env).map(k => [k, Deno.env.get(k)]));
    for (const [k, v] of Object.entries(env)) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
    const logged: string[] = [];
    const original = { error: console.error, log: console.log, warn: console.warn };
    const capture = (...args: unknown[]) => logged.push(args.map(a => a instanceof Error ? `${a.message} ${a.stack}` : typeof a === "string" ? a : JSON.stringify(a)).join(" "));
    console.error = console.log = console.warn = capture;
    try { await run(); } finally {
      Object.assign(console, original);
      for (const [k, v] of Object.entries(previous)) v === undefined ? Deno.env.delete(k) : Deno.env.set(k, v);
      for (const line of logged) for (const secret of [EMAIL, TOKEN, PASSWORD]) assert.ok(!line.includes(secret), `log leaked account data: ${line}`);
    }
  };
}

const post = (body: unknown, origin?: string) => new Request("https://backend.invalid/functions/v1/auth-signup", {
  method: "POST", headers: { "content-type": "application/json", ...(origin ? { origin } : {}) }, body: JSON.stringify(body),
});
const signupBody = { email: EMAIL, password: PASSWORD, firstName: "New", lastName: "Member", username: "new_member" };

function mailer() {
  const sent: { to: unknown; text?: string; html: string }[] = [];
  return { sent, sendEmail: (_key: string, m: { to: unknown; text?: string; html: string }) => { sent.push(m); return Promise.resolve(); } };
}
const linkIn = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]);

Deno.test("signup email link, fed to the real confirmation handler, confirms exactly once", withEnv(
  { SITE_URL: "https://nolto.social", EMAIL_LINK_ORIGINS: "https://www.nolto.social" }, async () => {
  const backend = fakeBackend(), mail = mailer();
  const signup = createSignupHandler({ apiKey: () => "test-key", db: () => backend.db, sendEmail: mail.sendEmail });
  const response = await signup(post(signupBody, "https://www.nolto.social"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, userId: "u-1", emailSent: true });
  assert.equal(mail.sent.length, 1);
  const link = linkIn(mail.sent[0].text!);
  assert.equal(link.origin, "https://www.nolto.social");
  assert.equal(link.pathname, "/confirm-email");
  assert.ok(mail.sent[0].html.includes(`href="https://www.nolto.social/confirm-email?token=${TOKEN}"`));

  const confirm = createConfirmHandler({ db: () => backend.db });
  const body = JSON.stringify({ token: link.searchParams.get("token") });
  const first = await confirm(new Request("https://backend.invalid/", { method: "POST", body }));
  assert.equal(first.status, 200);
  assert.deepEqual(backend.calls.confirmUser, [{ id: "u-1", input: { email_confirm: true } }]);
  assert.ok(backend.tokens[0].used_at);
  // Implemented replay behaviour: a used token answers success (reload/StrictMode) but
  // never re-runs the account update and grants no session.
  const replay = await confirm(new Request("https://backend.invalid/", { method: "POST", body }));
  assert.equal(replay.status, 200);
  assert.equal(backend.calls.confirmUser.length, 1);
}));

Deno.test("unlisted or forged Origin gets a SITE_URL link", withEnv({ SITE_URL: "https://nolto.social", EMAIL_LINK_ORIGINS: undefined }, async () => {
  for (const origin of ["https://www.nolto.social", "https://evil.example", "https://nolto.social.evil.example", undefined]) {
    const backend = fakeBackend(), mail = mailer();
    await createSignupHandler({ apiKey: () => "k", db: () => backend.db, sendEmail: mail.sendEmail })(post(signupBody, origin));
    assert.equal(linkIn(mail.sent[0].text!).origin, "https://nolto.social", String(origin));
  }
}));

Deno.test("resend uses the same link builder and never reveals whether the account exists", withEnv(
  { SITE_URL: "https://nolto.social", EMAIL_LINK_ORIGINS: "https://www.nolto.social" }, async () => {
  const pending = fakeBackend(), mail = mailer();
  const known = await createSignupHandler({ apiKey: () => "k", db: () => pending.db, sendEmail: mail.sendEmail })(post({ action: "resend", email: EMAIL }, "https://www.nolto.social"));
  assert.equal(pending.calls.createUser.length, 0);
  assert.equal(linkIn(mail.sent[0].text!).href, `https://www.nolto.social/confirm-email?token=${TOKEN}`);
  const unknownBackend = fakeBackend({ rpcToken: null }), none = mailer();
  const unknown = await createSignupHandler({ apiKey: () => "k", db: () => unknownBackend.db, sendEmail: none.sendEmail })(post({ action: "resend", email: EMAIL }));
  assert.equal(none.sent.length, 0);
  assert.deepEqual(await known.json(), await unknown.json());
  assert.equal(known.status, unknown.status);
}));

Deno.test("failure handling: validation, missing key, rate limit, provider failure", withEnv({ SITE_URL: "https://nolto.social" }, async () => {
  const backend = fakeBackend(), mail = mailer();
  const handler = createSignupHandler({ apiKey: () => "k", db: () => backend.db, sendEmail: mail.sendEmail });
  assert.equal((await handler(post({ ...signupBody, password: "short" }))).status, 422);
  assert.equal((await handler(post({ ...signupBody, username: "admin" }))).status, 422);
  assert.equal((await handler(new Request("https://backend.invalid/", { method: "GET" }))).status, 405);
  assert.equal((await createSignupHandler({ apiKey: () => undefined, db: () => backend.db })(post(signupBody))).status, 503);
  const limited = fakeBackend({ rateCount: 5 });
  assert.equal((await createSignupHandler({ apiKey: () => "k", db: () => limited.db, sendEmail: mail.sendEmail })(post(signupBody))).status, 429);
  assert.equal(limited.calls.createUser.length, 0);
  const failing = fakeBackend();
  const failed = await createSignupHandler({ apiKey: () => "k", db: () => failing.db, sendEmail: () => Promise.reject(new Error("Email provider returned 500")) })(post(signupBody));
  assert.equal(failed.status, 202);
  assert.deepEqual(await failed.json(), { success: true, userId: "u-1", emailSent: false });
  const dup = fakeBackend({ createError: "User already registered" });
  assert.equal((await createSignupHandler({ apiKey: () => "k", db: () => dup.db, sendEmail: mail.sendEmail })(post(signupBody))).status, 400);
}));

Deno.test("confirmation handler rejects malformed, unknown and expired tokens", withEnv({}, async () => {
  const backend = fakeBackend();
  await backend.db.rpc("request_email_verification", {});
  backend.tokens[0].expires_at = new Date(Date.now() - 1000).toISOString();
  const confirm = createConfirmHandler({ db: () => backend.db });
  const call = (token: unknown) => confirm(new Request("https://backend.invalid/", { method: "POST", body: JSON.stringify({ token }) }));
  assert.equal((await call("not-a-uuid")).status, 422);
  assert.equal((await call(crypto.randomUUID())).status, 400);
  const expired = await call(TOKEN);
  assert.equal(expired.status, 400);
  assert.deepEqual(await expired.json(), { error: "Token expired" });
  assert.equal(backend.calls.confirmUser.length, 0);
}));
