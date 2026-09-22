import { strict as assert } from "node:assert";
import { decryptValue, encryptValue } from "../functions/_shared/encryption.ts";
import { collectPages } from "../functions/_shared/export-pagination.ts";
import { requestBody, uuid } from "../functions/_shared/user-auth.ts";

const secret = "test-only-encryption-secret-do-not-deploy-123456789";
Deno.test("Encrypted messages use fresh IVs, full secrets and separate token keys", async () => {
  const text = "Ett privat meddelande åäö 🔒";
  const one = await encryptValue(text, secret, "message");
  const two = await encryptValue(text, secret, "message");
  assert.notEqual(one, two);
  assert.ok(one.startsWith("v2:"));
  assert.equal(await decryptValue(one, secret, "message"), text);
  await assert.rejects(() => decryptValue(one, secret, "oauth-token"));
  await assert.rejects(() => decryptValue(one, secret + "changed-after-32-characters", "message"));
  const bytes = Uint8Array.from(atob(one.slice(3)), c => c.charCodeAt(0));
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(() => decryptValue(`v2:${btoa(String.fromCharCode(...bytes))}`, secret, "message"));
  await assert.rejects(() => encryptValue(text, "too-short", "message"));
});
Deno.test("Existing AES-GCM data remains readable, but base64 plaintext tokens are rejected", async () => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret.slice(0, 32)), "AES-GCM", false, ["encrypt"]);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode("old private message"));
  const combined = new Uint8Array(12 + cipher.byteLength);
  combined.set(iv); combined.set(new Uint8Array(cipher), 12);
  assert.equal(await decryptValue(btoa(String.fromCharCode(...combined)), secret, "message"), "old private message");
  for (const value of [btoa("federated:plaintext-oauth-token-that-must-not-be-accepted"), btoa("raw-token"), "v9:unknown"]) {
    await assert.rejects(() => decryptValue(value, secret, "oauth-token"));
  }
});
Deno.test("Export continues when the API caps pages below the requested size", async () => {
  const expected = Array.from({ length: 1201 }, (_, i) => i);
  const actual = await collectPages((from, to) => Promise.resolve({ data: expected.slice(from, Math.min(to + 1, from + 100)), count: expected.length, error: null }));
  assert.deepEqual(actual, expected);
});
Deno.test("Export fails on partial reads, changed counts, query errors and size limits", async () => {
  await assert.rejects(() => collectPages(() => Promise.resolve({ data: [], count: 10, error: null })));
  await assert.rejects(() => collectPages(() => Promise.resolve({ data: [1], count: 2, error: null }), 1));
  await assert.rejects(() => collectPages(() => Promise.resolve({ data: null, count: null, error: new Error("offline") })));
  let page = 0;
  await assert.rejects(() => collectPages(() => Promise.resolve({ data: [++page], count: page === 1 ? 3 : 2, error: null })));
});
Deno.test("Request identifiers cannot inject PostgREST filters and bodies are bounded in bytes", async () => {
  assert.equal(uuid("11111111-1111-4111-8111-111111111111"), "11111111-1111-4111-8111-111111111111");
  for (const value of [null, "id),sender_id.neq.null", "", "a".repeat(36)]) assert.throws(() => uuid(value));
  for (const body of ["[]", "null", '"string"', "{invalid}", JSON.stringify({ value: "å".repeat(100) })]) {
    await assert.rejects(() => requestBody(new Request("https://nolto.social", { method: "POST", body }), 100));
  }
});
