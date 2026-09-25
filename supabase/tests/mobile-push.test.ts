import { validExpoToken, pushMessage, providerOutcome, retryDelay, retryableStatus } from '../functions/_shared/mobile-push.ts';
import { handler as register } from '../functions/mobile-push/handler.ts';
import { handler as send } from '../functions/send-mobile-push/handler.ts';
import { encryptValue, decryptValue } from '../functions/_shared/encryption.ts';
function assert(value: unknown, message = 'Assertion failed'): asserts value { if (!value) throw new Error(message); }
Deno.test('push payload is generic and contains only the opaque notification identifier', () => {
  const message = pushMessage('ExpoPushToken[abcdefghijklmno]', 'notification-id');
  assert(Object.keys(message.data).join() === 'notificationId');
  assert(!('url' in message.data) && !('badge' in message));
  assert(validExpoToken(message.to));
  assert(!validExpoToken('https://attacker.example/token'));
  assert(!validExpoToken('ExpoPushToken[abcdefghijklmno]\n'));
  assert(!validExpoToken('ExpoPushToken[' + 'a'.repeat(201) + ']'));
});
Deno.test('provider acceptance, receipts and terminal token failures are distinct', () => {
  assert(providerOutcome({ status: 'ok', id: 'ticket-id' }) === 'ok');
  assert(providerOutcome({ status: 'ok' }) === 'retry');
  assert(providerOutcome({ status: 'ok' }, true) === 'ok');
  assert(providerOutcome(undefined, true) === 'retry');
  assert(providerOutcome({ status: 'error', details: { error: 'DeviceNotRegistered' } }) === 'unregistered');
  assert(providerOutcome({ status: 'error', details: { error: 'MessageRateExceeded' } }) === 'retry');
  assert(providerOutcome({ status: 'error', details: { error: 'InvalidCredentials' } }) === 'failed');
  assert(retryableStatus(429) && retryableStatus(503) && !retryableStatus(401));
  assert(retryDelay(2) > retryDelay(1) && retryDelay(20) <= 3600);
});
Deno.test('native push endpoints reject unauthenticated requests before accessing data', async () => {
  assert((await register(new Request('https://example.invalid', { method: 'POST', body: '{}' }))).status === 401);
  assert((await register(new Request('https://example.invalid'))).status === 405);
  // requireWorker reads only this env var; no provider or database calls happen.
});
Deno.test('push token encryption is authenticated and separated from OAuth tokens', async () => {
  const key = 'test-only-32-character-encryption-key';
  const token = 'ExpoPushToken[abcdefghijklmno]';
  const ciphertext = await encryptValue(token, key, 'push-token');
  assert(!ciphertext.includes(token));
  assert(await decryptValue(ciphertext, key, 'push-token') === token);
  let rejected = false;
  try { await decryptValue(ciphertext, key, 'oauth-token'); } catch { rejected = true; }
  assert(rejected);
});
// Importing the worker must not start a server or require push credentials.
assert(typeof send === 'function');
