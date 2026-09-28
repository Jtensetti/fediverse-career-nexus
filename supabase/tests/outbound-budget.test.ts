import { strict as assert } from 'node:assert';
import { outboundBudget } from '../functions/_shared/outbound-budget.ts';
import { HttpError } from '../functions/_shared/user-auth.ts';

Deno.test('Concurrent outbound calls share an atomic budget and never store caller identities', async () => {
  const counts = new Map<string, number>();
  const db = { rpc: async (name: string, args: { p_key: string; p_limit: number; p_seconds: number }) => {
    assert.equal(name, 'mastodon_rate_limit');
    assert.match(args.p_key, /^[a-f0-9]{64}$/);
    assert.equal(args.p_seconds, 60);
    const count = (counts.get(args.p_key) || 0) + 1;
    counts.set(args.p_key, count);
    return { data: count <= args.p_limit, error: null };
  } };
  const calls = await Promise.allSettled(Array.from({ length: 20 }, () => outboundBudget(db, 'preview', 'synthetic-user-id', 5)));
  assert.equal(calls.filter(call => call.status === 'fulfilled').length, 5);
  for (const call of calls) if (call.status === 'rejected') assert.equal(call.reason.status, 429);
  await outboundBudget(db, 'follow', 'synthetic-user-id', 5);
});

Deno.test('Rotating callers cannot bypass the global ceiling; an unavailable limiter fails closed', async () => {
  const counts = new Map<string, number>();
  const db = { rpc: async (_: string, args: { p_key: string; p_limit: number; p_seconds: number }) => {
    const count = (counts.get(args.p_key) || 0) + 1;
    counts.set(args.p_key, count);
    return { data: count <= args.p_limit, error: null };
  } };
  for (let i = 0; i < 3; i++) await outboundBudget(db, 'inbox', `ip-${i}`, 10, 3);
  await assert.rejects(() => outboundBudget(db, 'inbox', 'another-ip', 10, 3), (e: unknown) => e instanceof HttpError && e.status === 429);
  for (const result of [{ data: true, error: new Error('offline') }, { data: null, error: null }]) {
    await assert.rejects(() => outboundBudget({ rpc: () => Promise.resolve(result) }, 'preview', 'user', 5),
      (e: unknown) => e instanceof HttpError && e.status === 503);
  }
});
