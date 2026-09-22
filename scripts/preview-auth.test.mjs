import test from 'node:test';
import assert from 'node:assert/strict';
import { brokeredPreviewStorage } from '../src/integrations/supabase/previewAuthStorage.ts';

function browserFixture(hostname) {
  const listeners = new Set();
  const sent = [];
  const values = new Map();
  const parent = { postMessage: (message, origin) => sent.push({ message, origin }) };
  const globals = {
    window: { parent, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) },
    location: { hostname, ancestorOrigins: ['https://lovable.dev'] },
    document: { referrer: '' },
    localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) },
  };
  const originals = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true });
  return {
    parent, sent, localStorage: globals.localStorage,
    dispatch: event => { for (const fn of listeners) fn(event); },
    restore: () => { for (const [key, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    } },
  };
}

test('preview sessions reject replies from the wrong window, origin or request', async () => {
  const fixture = browserFixture('id-preview--aaae6ed4-598c-43d7-b7d3-0c838ee77f5b.lovable.app');
  try {
    const storage = brokeredPreviewStorage();
    let resolved = false;
    const result = storage.getItem('test-session').then(value => { resolved = true; return value; });
    const [{ message, origin }] = fixture.sent;
    assert.equal(origin, 'https://lovable.dev');
    const reply = { type: 'lovable-preview-auth:result', requestId: message.requestId, ok: true, value: 'test-session-value' };
    fixture.dispatch({ source: {}, origin, data: reply });
    fixture.dispatch({ source: fixture.parent, origin: 'https://untrusted.example', data: reply });
    fixture.dispatch({ source: fixture.parent, origin, data: { ...reply, requestId: 'another-request' } });
    await Promise.resolve(); await Promise.resolve();
    assert.equal(resolved, false, 'a forged reply must not replace the session');
    fixture.dispatch({ source: fixture.parent, origin, data: reply });
    assert.equal(await result, 'test-session-value');
  } finally { fixture.restore(); }
});

test('the production domain keeps its session in local storage', () => {
  const fixture = browserFixture('nolto.social');
  try {
    const storage = brokeredPreviewStorage();
    assert.equal(storage, fixture.localStorage);
    storage.setItem('test-session', 'local-value');
    assert.equal(storage.getItem('test-session'), 'local-value');
    assert.deepEqual(fixture.sent, []);
  } finally { fixture.restore(); }
});
