import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  generateRsaKeyPair,
  signRequest,
  verifyRequestSignature,
  parseSignatureHeader,
} from "./http-signature.ts";

Deno.test("parseSignatureHeader splits on first '=' (preserves base64 padding)", () => {
  const sig = 'AAAA+bbb==';
  const header = `keyId="https://example.com/actor#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest",signature="${sig}"`;
  const parsed = parseSignatureHeader(header);
  assertEquals(parsed.keyId, "https://example.com/actor#main-key");
  assertEquals(parsed.algorithm, "rsa-sha256");
  assertEquals(parsed.signature, sig);
});

Deno.test("sign → verify round-trip", async () => {
  const { privateKey, publicKey } = await generateRsaKeyPair();
  const keyId = "https://samverkan.se/functions/v1/actor/alice#main-key";
  const url = "https://example.com/inbox";
  const body = JSON.stringify({ type: "Note", content: "hello" });

  const headers = new Headers();
  headers.set("Date", new Date().toUTCString());
  await signRequest(url, "POST", headers, body, privateKey, keyId);

  const req = new Request(url, { method: "POST", headers, body });
  const result = await verifyRequestSignature(req, body, {
    getPublicKey: async (_kid) => publicKey,
    skipReplayCache: true,
  });
  assert(result, "signature should verify");
  if (result) {
    assertEquals(result.keyId, keyId);
    assertEquals(result.keyIdHost, "samverkan.se");
  }
});

Deno.test("verify rejects tampered body", async () => {
  const { privateKey, publicKey } = await generateRsaKeyPair();
  const keyId = "https://samverkan.se/functions/v1/actor/alice#main-key";
  const url = "https://example.com/inbox";
  const body = JSON.stringify({ type: "Note", content: "original" });

  const headers = new Headers();
  headers.set("Date", new Date().toUTCString());
  await signRequest(url, "POST", headers, body, privateKey, keyId);

  // Tamper with body but keep the original digest
  const tamperedBody = JSON.stringify({ type: "Note", content: "tampered" });
  const req = new Request(url, { method: "POST", headers, body: tamperedBody });
  const result = await verifyRequestSignature(req, tamperedBody, {
    getPublicKey: async () => publicKey,
    skipReplayCache: true,
  });
  assert(!result, "tampered body must not verify");
});

Deno.test("verify rejects expired Date header", async () => {
  const { privateKey, publicKey } = await generateRsaKeyPair();
  const keyId = "https://samverkan.se/functions/v1/actor/alice#main-key";
  const url = "https://example.com/inbox";
  const body = "{}";

  const headers = new Headers();
  // 10 minutes ago — outside the ±5min window
  headers.set("Date", new Date(Date.now() - 10 * 60 * 1000).toUTCString());
  await signRequest(url, "POST", headers, body, privateKey, keyId);

  const req = new Request(url, { method: "POST", headers, body });
  const result = await verifyRequestSignature(req, body, {
    getPublicKey: async () => publicKey,
    skipReplayCache: true,
  });
  assert(!result, "expired date must not verify");
});
