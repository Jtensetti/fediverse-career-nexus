// Exercise the deployed handlers with fake Auth, REST, DNS and email transports.
// No network permissions are needed, and an unexpected request fails the test.
import { strict as assert } from "node:assert";

const BACKEND = "https://backend.example";
const ACTOR = "https://peer.example/users/alice";
const ADMIN = "11111111-1111-4111-8111-111111111111";
const FORM_USER = "22222222-2222-4222-8222-222222222222";
const CLAIMED_USER = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "44444444-4444-4444-8444-444444444444";
const FORM_EMAIL = "form@example.invalid";
const CLAIMED_EMAIL = "claimed@example.invalid";
const json = (value: unknown, headers: HeadersInit = {}) => new Response(JSON.stringify(value), {
  headers: { "content-type": "application/json", ...headers },
});

type Handler = (request: Request) => Promise<Response>;
const serve = Deno.serve;
const envGet = Deno.env.get;
const handlers: Handler[] = [];
Deno.env.get = (name: string) => ({
  SUPABASE_URL: BACKEND, SUPABASE_ANON_KEY: "test-anon", SUPABASE_SERVICE_ROLE_KEY: "test-service",
}[name] ?? envGet(name));
Deno.serve = ((handler: Handler) => { handlers.push(handler); return {}; }) as typeof Deno.serve;
try {
  await import("../functions/cache-manager/index.ts");
  await import("../functions/request-mfa-recovery/index.ts");
  await import("../functions/admin-issue-mfa-recovery/index.ts");
} finally { Deno.serve = serve; Deno.env.get = envGet; }
const [cacheHandler, recoveryHandler, issueHandler] = handlers;

function post(endpoint: string, body: unknown, authorization?: string, origin = "https://untrusted.example") {
  return new Request(`${BACKEND}/functions/v1/${endpoint}`, {
    method: "POST", headers: { "content-type": "application/json", origin,
      ...(authorization ? { authorization: `Bearer ${authorization}` } : {}) }, body: JSON.stringify(body),
  });
}

type Options = {
  remote?: (req: Request) => Promise<Response> | Response;
  dns?: string[];
  caller?: string | null;
  request?: Record<string, unknown>;
  timeout?: boolean;
};
async function mocked(options: Options, run: (state: {
  cached: Record<string, unknown>[]; requests: Record<string, unknown>[]; emails: Record<string, unknown>[];
  lookups: string[]; remoteRequests: Request[];
}) => Promise<void>) {
  const original = { fetch: globalThis.fetch, resolveDns: Deno.resolveDns, get: Deno.env.get,
    timeout: AbortSignal.timeout, error: console.error, log: console.log };
  const state = { cached: [] as Record<string, unknown>[], requests: [] as Record<string, unknown>[],
    emails: [] as Record<string, unknown>[], lookups: [] as string[], remoteRequests: [] as Request[] };
  Deno.env.get = (name: string) => ({ SUPABASE_URL: BACKEND, SUPABASE_ANON_KEY: "test-anon",
    SUPABASE_SERVICE_ROLE_KEY: "test-service", RESEND_API_KEY: "test-email", SITE_URL: "https://site.example",
  }[name] ?? original.get(name));
  Deno.resolveDns = ((_host: string, type: string) => Promise.resolve(type === "A" ? options.dns ?? ["1.1.1.1"] : [])) as typeof Deno.resolveDns;
  if (options.timeout) AbortSignal.timeout = () => AbortSignal.abort(new DOMException("Timed out", "TimeoutError"));
  console.error = console.log = () => {};
  globalThis.fetch = async (input, init) => {
    const req = new Request(input, init);
    const url = new URL(req.url);
    const body = async () => JSON.parse(await req.text());
    if (url.origin === BACKEND) {
      if (url.pathname === "/auth/v1/user") return json({ id: options.caller === undefined ? ADMIN : options.caller, email: "admin@example.invalid" });
      if (url.pathname === "/rest/v1/rpc/current_session_is_active" || url.pathname === "/rest/v1/rpc/current_session_is_verified") return json(true);
      if (url.pathname === "/rest/v1/rpc/is_admin") return json(options.caller === undefined || options.caller === ADMIN);
      if (url.pathname === "/rest/v1/rpc/get_user_id_by_email") {
        const email = (await body())._email;
        state.lookups.push(email);
        return json(email === CLAIMED_EMAIL ? CLAIMED_USER : email === FORM_EMAIL ? FORM_USER : null);
      }
      if (url.pathname === "/rest/v1/remote_actors_cache") {
        if (req.method === "GET") return json([{ actor_url: ACTOR, hit_count: 1 }]);
        if (req.method === "POST") { state.cached.push(await body()); return json(null); }
      }
      if (url.pathname === "/rest/v1/mfa_recovery_requests") {
        if (req.method === "HEAD") return new Response(null, { headers: { "content-range": "*/0" } });
        if (req.method === "POST") {
          state.requests.push(await body());
          return json({ id: REQUEST_ID, created_at: "2026-09-28T12:00:00Z" });
        }
        if (req.method === "GET") return json(options.request ?? {});
        if (req.method === "PATCH") return json(null);
      }
      if (url.pathname === "/rest/v1/user_roles") return json([{ user_id: ADMIN }]);
      if (url.pathname.startsWith("/auth/v1/admin/users/")) {
        const id = url.pathname.split("/").at(-1);
        return json({ user: { id, email: id === FORM_USER ? FORM_EMAIL : id === CLAIMED_USER ? CLAIMED_EMAIL : "admin@example.invalid" } });
      }
      if (url.pathname === "/rest/v1/mfa_recovery_tokens" || url.pathname === "/rest/v1/moderation_actions") return json(null);
      throw new Error(`Unexpected backend request: ${req.method} ${url.pathname}`);
    }
    if (url.href === "https://api.resend.com/emails") { state.emails.push(await body()); return json({ id: "fake-email" }); }
    if (url.href === ACTOR && options.remote) {
      state.remoteRequests.push(req);
      req.signal.throwIfAborted();
      return options.remote(req);
    }
    throw new Error(`Unexpected outbound request: ${req.method} ${url.href}`);
  };
  try { await run(state); }
  finally {
    globalThis.fetch = original.fetch; Deno.resolveDns = original.resolveDns; Deno.env.get = original.get;
    AbortSignal.timeout = original.timeout; console.error = original.error; console.log = original.log;
  }
}

const actorDocument = { id: ACTOR, inbox: "https://peer.example/inbox", preferredUsername: "alice" };
const prewarm = () => cacheHandler(post("cache-manager", { action: "prewarm" }, "test-admin"));

Deno.test("cache prewarm preserves valid actor documents through the bounded transport", async () => {
  await mocked({ remote: () => json(actorDocument) }, async state => {
    assert.equal((await prewarm()).status, 200);
    assert.equal(state.cached.length, 1);
    assert.deepEqual(state.cached[0].actor_data, actorDocument);
  });
});

Deno.test("cache prewarm does not follow a peer redirect", async () => {
  let followed = false;
  await mocked({ remote: req => {
    // Emulate fetch's redirect contract without opening a socket.
    if (req.redirect === "error") throw new TypeError("Redirect rejected");
    followed = true;
    return json(actorDocument);
  } }, async state => {
    const response = await prewarm();
    assert.equal(response.status, 200);
    assert.equal(followed, false);
    assert.equal((await response.json()).refreshed, 0);
    assert.equal(state.cached.length, 0);
  });
});

Deno.test("cache prewarm rechecks private DNS before opening the remote transport", async () => {
  await mocked({ dns: ["10.0.0.1"], remote: () => json(actorDocument) }, async state => {
    const response = await prewarm();
    assert.equal((await response.json()).refreshed, 0);
    assert.equal(state.remoteRequests.length, 0);
    assert.equal(state.cached.length, 0);
  });
});

Deno.test("cache prewarm rejects a changed actor identity", async () => {
  await mocked({ remote: () => json({ ...actorDocument, id: "https://peer.example/users/bob" }) }, async state => {
    assert.equal((await (await prewarm()).json()).refreshed, 0);
    assert.equal(state.cached.length, 0);
  });
});

Deno.test("cache prewarm limits a streamed document without content-length and cancels it", async () => {
  let cancelled = false;
  let chunk = 0;
  await mocked({ remote: () => new Response(new ReadableStream({
    pull(controller) {
      if (chunk++ === 0) controller.enqueue(new TextEncoder().encode(JSON.stringify({ ...actorDocument, padding: "x".repeat(1024 * 1024) })));
      else if (chunk === 2) controller.enqueue(new TextEncoder().encode(" "));
      else controller.close();
    },
    cancel() { cancelled = true; },
  }), { headers: { "content-type": "application/json" } }) }, async state => {
    assert.equal((await (await prewarm()).json()).refreshed, 0);
    assert.equal(state.cached.length, 0);
    assert.equal(cancelled, true);
  });
});

Deno.test("cache prewarm supplies and honors the outbound timeout signal", async () => {
  await mocked({ timeout: true, remote: () => json(actorDocument) }, async state => {
    assert.equal((await (await prewarm()).json()).refreshed, 0);
    assert.equal(state.cached.length, 0);
  });
});

Deno.test("anonymous and ordinary sessions cannot trigger cache prewarm", async () => {
  await mocked({ caller: FORM_USER, remote: () => json(actorDocument) }, async state => {
    assert.equal((await cacheHandler(post("cache-manager", { action: "prewarm" }))).status, 401);
    assert.equal((await prewarm()).status, 403);
    assert.equal(state.remoteRequests.length, 0);
  });
});

Deno.test("anonymous recovery accepts support details without inventing verified login evidence", async () => {
  await mocked({}, async state => {
    const response = await recoveryHandler(post("request-mfa-recovery", {
      email: FORM_EMAIL, attempted_login_email: FORM_EMAIL, message: "Lost authenticator", user_id: CLAIMED_USER,
    }));
    assert.equal(response.status, 200);
    assert.equal(state.requests.length, 1);
    assert.equal(state.requests[0].user_id, null);
    assert.equal(state.requests[0].message, "Lost authenticator");
    assert.equal(state.emails.length, 1);
    const html = String(state.emails[0].html);
    assert.match(html, /unverified/i);
    assert.doesNotMatch(html, /✓|password.validated|Attempted login email \(silent\)|Matchar:/i);
  });
});

Deno.test("a verified Auth identity, not request fields or Origin, determines the recovery user", async () => {
  await mocked({ caller: FORM_USER }, async state => {
    const response = await recoveryHandler(post("request-mfa-recovery", {
      email: FORM_EMAIL, attempted_login_email: CLAIMED_EMAIL, user_id: CLAIMED_USER,
    }, "test-user"));
    assert.equal(response.status, 200);
    assert.equal(state.requests[0].user_id, FORM_USER);
    assert.doesNotMatch(String(state.emails[0].html), /https:\/\/untrusted\.example/);
  });
});

Deno.test("issuing recovery for a legacy anonymous request ignores the unverified login-email claim", async () => {
  await mocked({ request: { id: REQUEST_ID, user_id: null, email: FORM_EMAIL, username: null,
    attempted_login_email: CLAIMED_EMAIL, status: "pending" } }, async state => {
    const response = await issueHandler(post("admin-issue-mfa-recovery", { request_id: REQUEST_ID }, "test-admin"));
    assert.equal(response.status, 200);
    assert.deepEqual(state.lookups, [FORM_EMAIL]);
    assert.equal(state.emails[0].to, FORM_EMAIL);
    assert.match(String(state.emails[0].html), /https:\/\/site\.example\/aterstall-mfa\?token=/);
    assert.doesNotMatch(String(state.emails[0].html), /https:\/\/untrusted\.example/);
  });
});
