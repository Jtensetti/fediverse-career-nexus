import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Trans } from 'react-i18next';
import { JSDOM } from 'jsdom';
import i18next from 'i18next';
import { UserFacingError, userFacingErrorMessage } from '../src/lib/userFacingError.ts';
import { createInboxKey, sealPrivateMessage } from '../src/lib/privateMessages.ts';
import { compressImage } from '../src/lib/imageCompression.ts';

const languages = ['sv', 'en', 'fr', 'de', 'nl', 'es', 'ja', 'it'];
const resources = Object.fromEntries(languages.map(language => [language, {
  translation: JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8')),
}]));
await i18next.init({ lng: 'en', fallbackLng: false, resources, interpolation: { escapeValue: false } });

// Exercise the actual service catch boundaries without a session or database.
globalThis.runtimeLocalizationTest = { translate: (key, values) => i18next.t(key, values) };
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/supabase') return { url: 'runtime-test:client', shortCircuit: true };
    if (specifier === './inboxKeysService') return { url: 'runtime-test:inbox', shortCircuit: true };
    if (specifier === '@/i18n/tx') return { url: 'runtime-test:tx', shortCircuit: true };
    if (['@/lib/userFacingError', '@/lib/privateMessages'].includes(specifier)) {
      return { url: new URL(`../src/lib/${specifier.split('/').at(-1)}.ts`, import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    const source = {
      'runtime-test:client': `export const supabase={
        auth:{getSession:async()=>({data:{session:{user:{id:'alice'}}}})},
        from:()=>({select:()=>({or:()=>({order:()=>({limit:async()=>({data:[],error:null})})})})}),
        functions:{invoke:async()=>({data:{messages:[{encryption_version:'openpgp-v1'}]},error:null})}
      };`,
      'runtime-test:inbox': `export const inboxRevision=()=>0;
        export async function decryptIncomingMessage(){throw globalThis.runtimeLocalizationTest.error;}
        export async function encryptOutgoingMessage(){throw new Error('Unexpected send');}`,
      'runtime-test:tx': `export const tx=(key,values)=>globalThis.runtimeLocalizationTest.translate(key,values);`,
    }[url];
    return source ? { format: 'module', source, shortCircuit: true } : next(url, context);
  },
});
const { getConversationWithMessages } = await import('../src/services/messaging/messageService.ts');
const { scopeDescription } = await import('../src/services/auth/mastodonClientService.ts');

test('an existing validation error follows all eight language selections', async () => {
  for (const length of [15, 1025]) {
    let error;
    try { await createInboxKey('test-account', 'x'.repeat(length)); }
    catch (caught) { error = caught; }
    assert.ok(error instanceof UserFacingError);
    const messages = new Set();
    for (const language of languages) {
      await i18next.changeLanguage(language);
      assert.equal(error.message, resources[language].translation.runtimeErrors.passphraseLength);
      assert.doesNotMatch(error.message, /runtimeErrors\./);
      messages.add(error.message);
    }
    assert.equal(messages.size, 8);
  }
});

test('a key-change warning survives the UI fallback and language changes', async () => {
  const key = { getFingerprint: () => 'current-key' };
  let error;
  try {
    await sealPrivateMessage({ sender_key_fingerprint: 'previous-key' }, 'hello', key, key, key);
  } catch (caught) { error = caught; }
  assert.ok(error instanceof UserFacingError);
  for (const language of languages) {
    await i18next.changeLanguage(language);
    assert.equal(userFacingErrorMessage(error, 'runtimeErrors.keyLoad'), resources[language].translation.runtimeErrors.keyChanged);
    assert.equal(userFacingErrorMessage(new Error('private database details'), 'runtimeErrors.keyLoad'), resources[language].translation.runtimeErrors.keyLoad);
  }
});

test('conversation loading keeps key-change warnings through its service catch boundary', async () => {
  for (const language of languages) {
    await i18next.changeLanguage(language);
    const error = new UserFacingError('runtimeErrors.keyChanged');
    globalThis.runtimeLocalizationTest.error = error;
    await assert.rejects(getConversationWithMessages('bob'), caught => {
      assert.equal(caught, error);
      assert.equal(caught.message, resources[language].translation.runtimeErrors.keyChanged);
      return true;
    });
  }
  globalThis.runtimeLocalizationTest.error = new Error('internal cryptography details');
  await assert.rejects(getConversationWithMessages('bob'), caught => {
    assert.ok(caught instanceof UserFacingError);
    assert.doesNotMatch(caught.message, /internal cryptography/);
    return true;
  });
});

test('every supported app permission has a translated description after language changes', async () => {
  const scopes = ['read', 'write', 'follow', 'push', 'read:accounts', 'read:statuses', 'read:favourites', 'read:follows', 'write:statuses', 'write:favourites', 'write:follows'];
  for (const scope of scopes) {
    const descriptions = new Set();
    for (const language of languages) {
      await i18next.changeLanguage(language);
      const description = scopeDescription(scope);
      assert.notEqual(description, scope);
      assert.doesNotMatch(description, /reviewUI\./);
      descriptions.add(description);
    }
    assert.equal(descriptions.size, 8, scope);
  }
  assert.equal(scopeDescription('unknown:scope'), 'unknown:scope');
});

test('image validation preserves actionable translated errors', async () => {
  const invalidFiles = [
    [new File(['not an image'], 'example.txt', { type: 'text/plain' }), 'imageType'],
    [new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }), 'imageSize'],
  ];
  for (const [file, expected] of invalidFiles) {
    let error;
    try { await compressImage(file); } catch (caught) { error = caught; }
    assert.ok(error instanceof UserFacingError);
    for (const language of languages) {
      await i18next.changeLanguage(language);
      assert.equal(userFacingErrorMessage(error, 'runtimeErrors.imageUpload'), resources[language].translation.runtimeErrors[expected]);
    }
  }
});

test('account agreement renders complete translated sentences with both real links', async () => {
  for (const language of languages) {
    await i18next.changeLanguage(language);
    const html = renderToStaticMarkup(React.createElement(Trans, {
      i18n: i18next,
      i18nKey: 'auth.accountAgreement',
      components: {
        terms: React.createElement('a', { href: '/terms' }),
        privacy: React.createElement('a', { href: '/privacy' }),
      },
    }));
    const dom = new JSDOM(html);
    const body = dom.window.document.body;
    assert.equal(body.querySelectorAll('a').length, 2, language);
    assert.ok(body.querySelector('a[href="/terms"]').textContent.length > 1, language);
    assert.ok(body.querySelector('a[href="/privacy"]').textContent.length > 1, language);
    assert.equal(body.textContent, resources[language].translation.auth.accountAgreement.replace(/<\/?(?:terms|privacy)>/g, ''), language);
    dom.window.close();
  }
});
