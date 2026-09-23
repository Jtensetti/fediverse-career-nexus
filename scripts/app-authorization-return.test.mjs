import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_AUTHORIZATION_RETURN, rememberAppAuthorization, consumeAppAuthorization } from '../src/lib/appAuthorizationReturn.ts';

function memory() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
const path = '/oauth/authorize?client_id=fixture&redirect_uri=tusky%3A%2F%2Foauth&state=one%2Btwo&code_challenge=challenge';

test('provider return preserves consent parameters, is tab scoped and can be consumed once', () => {
  const tab = memory();
  rememberAppAuthorization(path, tab, 1000);
  assert.equal(consumeAppAuthorization(memory(), 1001), null);
  assert.equal(consumeAppAuthorization(tab, 1001), path);
  assert.equal(consumeAppAuthorization(tab, 1001), null);
});

test('return data cannot send a signed-in user to an external URL, callback, or stale consent', () => {
  for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/auth/social/callback', '/oauth/authorize/../token?x=1', '/oauth/authorize?x=1#fragment', '/oauth/authorize?x=\n', '/oauth/authorize?x=1\\']) {
    const tab = memory();
    assert.throws(() => rememberAppAuthorization(bad, tab, 1000));
    tab.setItem(APP_AUTHORIZATION_RETURN, JSON.stringify({ path: bad, createdAt: 1000 }));
    assert.equal(consumeAppAuthorization(tab, 1001), null);
    assert.equal(tab.getItem(APP_AUTHORIZATION_RETURN), null);
  }
  for (const createdAt of [1002, 1001 - 900001, '1000', null]) {
    const tab = memory();
    tab.setItem(APP_AUTHORIZATION_RETURN, JSON.stringify({ path, createdAt }));
    assert.equal(consumeAppAuthorization(tab, 1001), null);
  }
  assert.equal(consumeAppAuthorization({ getItem() { throw new Error('storage blocked'); } }), null);
});
