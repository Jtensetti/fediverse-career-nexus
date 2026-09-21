import { deliverInboxes } from "../functions/_shared/delivery.ts";
import { strict as assert } from "node:assert";
import { createActorDocument, createWebFingerDocument, parseLocalResource } from "../functions/_shared/actor-document.ts";
import { buildActorUrl, getFederationBaseUrl, getSiteUrl, functionPath } from "../functions/_shared/federation-urls.ts";
import { generateRsaKeyPair, signRequest, verifySignature, parseSignatureHeader, fetchPublicKey } from "../functions/_shared/http-signature.ts";
import { remoteUrl, isPublicAddress, readBody } from "../functions/_shared/remote-fetch.ts";
import { pkceChallenge } from "../functions/_shared/oauth.ts";
import { isPublic, localCreate, PUBLIC } from "../functions/_shared/local-content.ts";

Deno.env.set("FEDERATION_DOMAIN", "nolto.social");
Deno.env.set("SITE_URL", "https://nolto.tensetti.io");
Deno.test("UI relocation does not change a published Nolto identity", () => {
  assert.equal(getSiteUrl(), "https://nolto.tensetti.io");
  assert.equal(getFederationBaseUrl(), "https://nolto.social");
  assert.equal(buildActorUrl("alice"), "https://nolto.social/functions/v1/actor/alice");
});
Deno.test("WebFinger resolves local handles, actor IDs and profile aliases", () => {
  for (const resource of ["acct:Alice@NOLTO.SOCIAL", "acct:alice@www.nolto.social", "https://nolto.social/@alice", "https://nolto.social/profile/alice", buildActorUrl("alice")]) assert.equal(parseLocalResource(resource), "alice");
});
Deno.test("WebFinger rejects foreign domains, credentials, encoded separators and invalid usernames", () => {
  for (const resource of ["acct:alice@evil.example", "acct:al@nolto.social", "acct:alice.bob@nolto.social", "https://nolto.social.evil.example/profile/alice", "https://alice@nolto.social/profile/alice", "https://nolto.social/profile/alice%2Fbob", "http://nolto.social/profile/alice", "https://nolto.social/profile/alice?x=1"]) assert.equal(parseLocalResource(resource), null, resource);
});
Deno.test("WebFinger subject and self link agree; rel filters omit other links", () => {
  const doc = createWebFingerDocument("alice", ["self"]);
  assert.equal(doc.subject, "acct:alice@nolto.social");
  assert.deepEqual(doc.links, [{ rel: "self", type: "application/activity+json", href: buildActorUrl("alice") }]);
  assert.deepEqual(createWebFingerDocument("alice", ["unknown"]).links, []);
});
Deno.test("Actor documents carry a real owned key, escaped biography and matching collections", () => {
  const doc = createActorDocument({ username: "alice", bio: '<script>alert("x")</script>' }, { public_key: "-----BEGIN PUBLIC KEY-----\ntest\n-----END PUBLIC KEY-----", created_at: "2026-09-21T00:00:00Z" });
  assert.equal(doc.publicKey.owner, doc.id);
  assert.equal(doc.publicKey.id, `${doc.id}#main-key`);
  assert.equal(doc.inbox, "https://nolto.social/functions/v1/inbox/alice");
  assert.equal(doc.followers, "https://nolto.social/functions/v1/followers/alice");
  assert.ok(!doc.summary.includes("<script>"));
  assert.ok(!JSON.stringify(doc).includes("private_key"));
  assert.throws(() => createActorDocument({ username: "alice" }, { public_key: "demo-seed", created_at: "" }));
});
Deno.test("Function paths work behind the Supabase gateway and reject malformed escapes", () => {
  assert.deepEqual(functionPath(new URL("https://backend.example/functions/v1/inbox/alice"), "inbox"), ["alice"]);
  assert.deepEqual(functionPath(new URL("https://backend.example/functions/v1/inbox"), "inbox"), []);
  assert.equal(functionPath(new URL("https://backend.example/functions/v1/actor/%ZZ"), "actor"), null);
});
Deno.test("Remote URLs reject private hosts, IP literals, cleartext and user credentials", () => {
  for (const url of ["http://mastodon.social/a", "https://127.0.0.1/a", "https://[::1]/", "https://0x7f000001/", "https://host.local/", "https://user:pass@mastodon.social/", "https://mastodon.social:8443/a"]) assert.throws(() => remoteUrl(url), url);
  assert.equal(remoteUrl("https://mastodon.social/users/alice").hostname, "mastodon.social");
});
Deno.test("SSRF address filter excludes private and special DNS answers", () => {
  for (const ip of ["0.0.0.0", "10.0.0.1", "127.0.0.1", "100.64.0.1", "169.254.169.254", "172.31.0.1", "192.168.1.1", "192.0.2.4", "198.51.100.1", "203.0.113.1", "224.0.0.1", "::1", "::ffff:127.0.0.1", "fc00::1", "fe80::1", "2001:db8::1", "2002:7f00:1::"]) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});
Deno.test("Body limit applies to streamed requests without content-length", async () => {
  await assert.rejects(() => readBody(new Request("https://nolto.social", { method: "POST", body: "123456" }), 5));
  assert.equal(await readBody(new Response("åäö"), 6), "åäö");
});
Deno.test("PKCE matches RFC 7636 S256 test vector", async () => {
  assert.equal(await pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
});
Deno.test("A key belonging to another user on the same server cannot authorize an actor", async () => {
  assert.equal(await fetchPublicKey("https://mastodon.social/users/alice#main-key", "https://mastodon.social/users/bob"), null);
});
Deno.test("HTTP signatures survive a host rewrite but reject body/path/date/header tampering", async () => {
  const keys = await generateRsaKeyPair();
  const url = "https://nolto.social/functions/v1/inbox/alice?x=1";
  const body = JSON.stringify({ type: "Follow", actor: "https://mastodon.social/users/bob", object: buildActorUrl("alice") });
  const headers = new Headers();
  await signRequest(url, "POST", headers, body, keys.privateKey, "https://mastodon.social/users/bob#main-key");
  const request = (h = headers, path = "/functions/v1/inbox/alice?x=1") => new Request(`https://backend.supabase.co${path}`, { method: "POST", headers: h });
  assert.equal(await verifySignature(request(), body, () => Promise.resolve(keys.publicKey)), true);
  assert.equal(await verifySignature(request(), body + " ", () => Promise.resolve(keys.publicKey)), false);
  assert.equal(await verifySignature(request(headers, "/functions/v1/inbox/bob?x=1"), body, () => Promise.resolve(keys.publicKey)), false);
  const old = new Headers(headers); old.set("Date", "Mon, 01 Jan 2024 00:00:00 GMT");
  assert.equal(await verifySignature(request(old), body, () => Promise.resolve(keys.publicKey)), false);
  const missingDigest = new Headers(headers); missingDigest.set("Signature", headers.get("Signature")!.replace("host date digest", "host date"));
  assert.equal(await verifySignature(request(missingDigest), body, () => Promise.resolve(keys.publicKey)), false);
  assert.equal(parseSignatureHeader('keyId="a",keyId="b",headers="host",signature="AA=="'), null);
});
Deno.test("Local Create wrappers become resolvable public objects, without reusing backend URLs", () => {
  const row = { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-09-21T00:00:00Z", content: { type: "Create", object: { type: "Note", content: "Hello <script>\nWorld", to: [PUBLIC], actor: { id: "internal" } } } };
  const activity = localCreate(row, "alice");
  assert.equal(isPublic(row.content), true);
  assert.equal(isPublic({ type: "Note", to: ["https://nolto.social/functions/v1/actor/bob"] }), false);
  assert.equal(activity.object.id, `https://nolto.social/functions/v1/objects/${row.id}`);
  assert.equal(activity.object.attributedTo, activity.actor);
  assert.equal(activity.object.content, "<p>Hello &lt;script&gt;<br>World</p>");
  assert.equal(activity.object.actor, undefined);
});

Deno.test("Partial delivery failures are retried without resending successful inboxes", async () => {
  const delivered = new Set<string>();
  const calls: string[] = [];
  const inboxes = ["https://one.example/inbox", "https://two.example/inbox", "https://one.example/inbox"];
  const failures = await deliverInboxes(inboxes, delivered, inbox => {
    calls.push(inbox); return Promise.resolve(new Response(null, { status: inbox.includes("one.") ? 503 : 202 }));
  }, () => Promise.resolve());
  assert.equal(failures.length, 1);
  assert.deepEqual([...delivered], ["https://two.example/inbox"]);
  const retry = await deliverInboxes(inboxes, delivered, inbox => { calls.push(inbox); return Promise.resolve(new Response(null, { status: 202 })); }, () => Promise.resolve());
  assert.deepEqual(retry, []);
  assert.deepEqual(calls, ["https://one.example/inbox", "https://two.example/inbox", "https://one.example/inbox"]);
});
Deno.test("Failed delivery receipt is not reported as completed", async () => {
  const delivered = new Set<string>();
  const failures = await deliverInboxes(["https://one.example/inbox"], delivered, () => Promise.resolve(new Response(null, { status: 202 })), () => Promise.reject(new Error("database unavailable")));
  assert.equal(failures.length, 1);
  assert.equal(delivered.size, 0);
});
