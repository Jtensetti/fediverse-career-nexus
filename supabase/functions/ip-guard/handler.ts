import { z } from "npm:zod@3.25.76";

type Rpc = { rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }> };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const bodySchema = z.object({
  action: z.enum(["check", "hit"]),
  ip: z.string().min(2).max(64).regex(/^[0-9a-fA-F:.]+$/),
  reason: z.string().max(120).regex(/^[\x20-\x7e]*$/).optional(),
});

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Raw IPs are never stored: salted with the gateway secret. */
export async function ipHash(secret: string, ip: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`ip-guard:${secret}:${ip.toLowerCase()}`));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export const createIpGuardHandler = (deps: { secret: () => string | undefined; db: () => Rpc }) => async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const secret = deps.secret();
  if (!secret || secret.length < 32) return json({ error: "Not configured" }, 503);
  if (!timingSafeEqual(req.headers.get("x-gateway-secret") ?? "", secret)) return json({ error: "Forbidden" }, 403);
  let raw: unknown;
  try { raw = JSON.parse(await req.text()); } catch { return json({ error: "Invalid body" }, 400); }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return json({ error: "Validation error" }, 400);
  const hash = await ipHash(secret, parsed.data.ip);
  const db = deps.db();
  const { data, error } = parsed.data.action === "hit"
    ? await db.rpc("record_honeypot_hit", { p_ip_hash: hash, p_reason: parsed.data.reason || "honeypot" })
    : await db.rpc("ip_block_until", { p_ip_hash: hash });
  if (error) { console.error("ip-guard rpc failed"); return json({ error: "Unavailable" }, 503); }
  return json({ blockedUntil: typeof data === "string" ? data : null });
};
