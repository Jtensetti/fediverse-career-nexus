import { strict as assert } from 'node:assert';
import { encryptRetainedFile, decryptRetainedFile, encryptValue, decryptValue } from '../functions/_shared/encryption.ts';
import { contentMediaReferences, ownedMediaReferences } from '../functions/_shared/deletion.ts';
import { logMetrics } from '../functions/_shared/logger.ts';

Deno.test('retained files are authenticated, bound to their deletion request and independent of OAuth keys', async () => {
  const secret = 'retention-test-secret-never-use-in-production';
  const bytes = new TextEncoder().encode('private deleted photograph bytes');
  const path = 'request-id/object-id.bin';
  const encrypted = await encryptRetainedFile(bytes, secret, path);
  assert.deepEqual(await decryptRetainedFile(encrypted, secret, path), bytes);
  assert.notDeepEqual(await encryptRetainedFile(bytes, secret, path), encrypted);
  await assert.rejects(() => decryptRetainedFile(encrypted, secret, 'another-request/file.bin'));
  await assert.rejects(() => decryptRetainedFile(encrypted, secret + 'wrong', path));
  encrypted[encrypted.length - 1] ^= 1;
  await assert.rejects(() => decryptRetainedFile(encrypted, secret, path));
  const archived = await encryptValue('retained post', secret, 'retention');
  assert.equal(await decryptValue(archived, secret, 'retention'), 'retained post');
  await assert.rejects(() => decryptValue(archived, secret, 'oauth-token'));
});

Deno.test('content deletion selects attached own-origin media, not linked avatars or arbitrary hosts', () => {
  const origin = 'https://example.supabase.co';
  const photo = `${origin}/functions/v1/public-media/posts/photo.jpg`;
  const avatar = `${origin}/functions/v1/public-media/avatars/avatar.jpg`;
  assert.deepEqual(contentMediaReferences('post', { content: { type: 'Create', actor: { icon: avatar }, object: {
    content: `Link to ${avatar}`, attachment: [{ url: photo }, { url: 'https://other.example/posts/remote.jpg' }],
  } } }, origin), [{ bucket: 'posts', name: 'photo.jpg' }]);
  assert.deepEqual(contentMediaReferences('article', { cover_image_url: photo,
    content: `<p><a href='${avatar}'>profile</a></p><img src='${photo}'>` }, origin), [{ bucket: 'posts', name: 'photo.jpg' }]);
  assert.deepEqual(ownedMediaReferences(`${origin}/functions/v1/public-media/posts/%2E%2E/private.txt`, origin), []);
});

Deno.test('structured application logs drop identities, content, tokens and raw errors', () => {
  assert.deepEqual(logMetrics({ emailsSent: 3, userId: 'alice', email: 'alice@example.invalid', ip: '192.0.2.1',
    content: 'private', passphrase: 'secret', token: 'bearer', error: new Error('private details'), nested: { userId: 'bob' } }), { emailsSent: 3 });
});
