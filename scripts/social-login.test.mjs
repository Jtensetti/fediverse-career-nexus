import test from 'node:test';
import assert from 'node:assert/strict';
import { readSocialLogin } from '../src/lib/socialLogin.ts';

test('managed sign-in callback requires the starting browser, fresh state and an unambiguous token pair', () => {
  const now = 1000000, flow = 'a'.repeat(64), raw = JSON.stringify({ flow, createdAt: now });
  assert.deepEqual(readSocialLogin(raw, flow, '#access_token=test-access&refresh_token=test-refresh', now), { access_token: 'test-access', refresh_token: 'test-refresh' });
  for (const [saved, state, hash, at] of [
    [null, flow, '#access_token=x&refresh_token=y', now],
    [raw, 'b'.repeat(64), '#access_token=x&refresh_token=y', now],
    [raw, flow, '#access_token=x&refresh_token=y', now + 900001],
    [raw, flow, '#access_token=x&refresh_token=y', now - 1],
    [raw, flow, '#access_token=x&access_token=z&refresh_token=y', now],
    [raw, flow, '#access_token=x&refresh_token=y&error=denied', now],
  ]) assert.throws(() => readSocialLogin(saved, state, hash, at));
});
