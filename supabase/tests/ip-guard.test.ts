import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { createIpGuardHandler, ipHash } from "../functions/ip-guard/handler.ts";

const SECRET = "s".repeat(40);
const call = (handler: (r: Request) => Promise<Response>, body: unknown, secret = SECRET) =>
  handler(new Request("https://x/ip-guard", { method: "POST", headers: { "x-gateway-secret": secret }, body: JSON.stringify(body) }));

Deno.test("ip-guard rejects wrong secret and stores only hashes", async () => {
  const calls: Record<string, unknown>[] = [];
  const handler = createIpGuardHandler({ secret: () => SECRET, db: () => ({ rpc: (_n, args) => { calls.push(args); return Promise.resolve({ data: "2030-01-01T00:00:00Z", error: null }); } }) });
  assertEquals((await call(handler, { action: "hit", ip: "1.2.3.4" }, "wrong".repeat(8))).status, 403);
  const res = await call(handler, { action: "hit", ip: "1.2.3.4", reason: "honeypot /.env" });
  assertEquals(res.status, 200);
  assertEquals((await res.json()).blockedUntil, "2030-01-01T00:00:00Z");
  assertMatch(String(calls[0].p_ip_hash), /^[0-9a-f]{64}$/);
  assertEquals(JSON.stringify(calls).includes("1.2.3.4"), false);
  assertEquals(calls[0].p_ip_hash, await ipHash(SECRET, "1.2.3.4"));
});

Deno.test("ip-guard validates input and reports unavailability", async () => {
  const handler = createIpGuardHandler({ secret: () => SECRET, db: () => ({ rpc: () => Promise.resolve({ data: null, error: new Error("x") }) }) });
  assertEquals((await call(handler, { action: "hit", ip: "not an ip!" })).status, 400);
  assertEquals((await call(handler, { action: "check", ip: "::1" })).status, 503);
  const off = createIpGuardHandler({ secret: () => undefined, db: () => { throw new Error(); } });
  assertEquals((await call(off, { action: "check", ip: "::1" })).status, 503);
});
