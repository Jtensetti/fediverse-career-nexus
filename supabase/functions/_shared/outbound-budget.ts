import { HttpError } from './user-auth.ts';

type BudgetStore = {
  rpc(name: string, args: { p_key: string; p_limit: number; p_seconds: number }):
    PromiseLike<{ data: unknown; error: unknown }>;
};

/** Atomic, shared across Edge instances; raw user IDs/IPs are never stored.
 * A global ceiling also bounds abuse when a client rotates/spoofs its IP.
 * The existing service-only RPC serializes increments in PostgreSQL.
 */
export async function outboundBudget(db: BudgetStore, endpoint: string, caller: string, limit: number, globalLimit = limit * 50) {
  for (const [scope, maximum] of [[`caller:${caller}`, limit], ['global', globalLimit]] as const) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`outbound:${endpoint}:${scope}`));
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const { data, error } = await db.rpc('mastodon_rate_limit', { p_key: key, p_limit: maximum, p_seconds: 60 });
    if (error || typeof data !== 'boolean') throw new HttpError(503, 'Request limiting is temporarily unavailable');
    if (!data) throw new HttpError(429, 'Too many requests. Try again shortly.');
  }
}

export function requestAddress(req: Request): string {
  return (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 128);
}
