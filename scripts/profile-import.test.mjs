import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { profileShareRequest, selectedProfile } from '../src/lib/profileSharing.ts';

const nonce = 'a'.repeat(32);
test('profile consent validates the recipient and never includes unselected or unrequested fields', () => {
  const request = profileShareRequest(`?origin=https%3A%2F%2Frecruiter.example&request=${nonce}&fields=name,email`);
  assert.equal(request.origin, 'https://recruiter.example');
  assert.deepEqual(selectedProfile({ name: 'Ada', email: 'ada@example.invalid', phone: 'secret' }, request.fields, new Set(['name', 'phone'])), { name: 'Ada' });
  for (const origin of ['https://user:pass@recruiter.example','https://recruiter.example/path','javascript:alert(1)','http://recruiter.example','null']) assert.throws(() => profileShareRequest(`?origin=${encodeURIComponent(origin)}&request=${nonce}&fields=name`));
  assert.throws(() => profileShareRequest(`?origin=https%3A%2F%2Frecruiter.example&request=weak&fields=name`));
  assert.throws(() => profileShareRequest(`?origin=https%3A%2F%2Frecruiter.example&request=${nonce}&fields=access_token`));
});

test('embed accepts only its Nolto origin, exact popup and request ID; no unsolicited fields escape', async () => {
  const dom = new JSDOM('<script src="https://nolto.social/embed/nolto-profile.js"></script>', { url: 'https://recruiter.example/apply', runScripts: 'outside-only' });
  const { window } = dom;
  const popup = { closed: false };
  let opened;
  window.open = url => { opened = new URL(url); return popup; };
  Object.defineProperty(window.document, 'currentScript', { value: window.document.querySelector('script') });
  try {
    window.eval(await readFile(new URL('../public/embed/nolto-profile.js', import.meta.url), 'utf8'));
    const result = window.Nolto.requestProfile({ fields: ['name'] });
    const data = { type: 'nolto:profile', request: opened.searchParams.get('request'), profile: { name: 'Ada', email: 'private@example.invalid', access_token: 'never' } };
    let resolved = false; result.then(() => { resolved = true; });
    window.dispatchEvent(new window.MessageEvent('message', { origin: 'https://evil.example', source: popup, data }));
    window.dispatchEvent(new window.MessageEvent('message', { origin: 'https://nolto.social', source: {}, data }));
    window.dispatchEvent(new window.MessageEvent('message', { origin: 'https://nolto.social', source: popup, data: { ...data, request: 'bad' } }));
    await Promise.resolve(); assert.equal(resolved, false);
    window.dispatchEvent(new window.MessageEvent('message', { origin: 'https://nolto.social', source: popup, data }));
    assert.deepEqual(JSON.parse(JSON.stringify(await result)), { name: 'Ada' });
    assert.equal(opened.searchParams.get('origin'), 'https://recruiter.example');
  } finally { window.close(); }
});
