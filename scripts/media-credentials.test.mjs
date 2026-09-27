import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaCrossOrigin } from '../src/lib/mediaCredentials.ts';

test('known CORS media loads without cross-origin cookies; unrelated images retain compatibility', () => {
  const base = 'https://media.supabase.co';
  for (const path of ['/functions/v1/public-media/avatars/a.PNG', '/functions/v1/proxy-media?url=https%3A%2F%2Fremote.example%2Fa.png']) {
    assert.equal(mediaCrossOrigin(base + path, base), 'anonymous');
  }
  for (const src of [undefined, '/brand/mascot.webp', 'blob:https://nolto.social/image', 'https://remote.example/a.png',
    'https://media.supabase.co.evil.example/functions/v1/public-media/a',
    'https://media.supabase.co@evil.example/functions/v1/public-media/a',
    base + '/auth/v1/authorize', base + '/functions/v1/public-media-evil/a']) {
    assert.equal(mediaCrossOrigin(src, base), undefined);
  }
});
