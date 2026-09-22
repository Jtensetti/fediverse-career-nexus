import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { readAtprotoLogin } from '../src/lib/atprotoLogin.ts';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/feed' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'NodeFilter', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver', 'getComputedStyle']) globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
globalThis.contentTestTranslate = key => key.split('.').reduce((object, part) => object?.[part], translations) ?? key;
let response = { data: { level: 'allow', reason: null } }, calls = 0, errorToasts = 0;
globalThis.contentTestBackend = { rpc: async () => { calls++; return response; } };
globalThis.contentTestError = () => errorToasts++;
const mocks = {
  '@/lib/supabase': 'export const supabase=globalThis.contentTestBackend;',
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.contentTestTranslate});',
  'sonner': 'export const toast={error:globalThis.contentTestError};',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'test-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('test-mock:')) return { format: 'module', source: mocks[url.slice(10)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { useContentCheck } = await import('../src/hooks/useContentCheck.tsx');
const button = label => [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label);

test('language reminders require a choice, preserve the ability to edit, distinguish review and fail closed on network errors', async () => {
  let probe;
  function Probe() { probe = useContentCheck(); return probe.dialog; }
  const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(React.createElement(MemoryRouter, {}, React.createElement(Probe))));
  let outcome;
  await React.act(async () => { outcome = await probe.check('A respectful disagreement'); });
  assert.equal(outcome, true);
  assert.equal(document.querySelector('[role="dialog"]'), null);
  response = { data: { level: 'warn', reason: 'personal_attack' } };
  let pending;
  await React.act(async () => { pending = probe.check('Du är en idiot'); });
  assert.ok(document.querySelector('[role="dialog"]'));
  assert.equal(probe.checking, true);
  const beforeDuplicate = calls;
  assert.equal(await probe.check('duplicate click'), false);
  assert.equal(calls, beforeDuplicate);
  await React.act(async () => button(translations.contentCare.edit).click());
  assert.equal(await pending, false);
  await React.act(async () => { pending = probe.check('Du är en idiot'); });
  await React.act(async () => button(translations.contentCare.sendAnyway).click());
  assert.equal(await pending, true);
  response = { data: { level: 'review', reason: 'threat_or_group_violence' } };
  await React.act(async () => { pending = probe.check('Jag ska döda dig'); });
  assert.ok(button(translations.contentCare.submitReview));
  assert.equal(button(translations.contentCare.sendAnyway), undefined);
  assert.match(document.querySelector('a').getAttribute('href'), /conversation-guide/);
  await React.act(async () => button(translations.contentCare.submitReview).click());
  assert.equal(await pending, true);
  response = { error: new Error('Offline') };
  await React.act(async () => { outcome = await probe.check('Draft must stay'); });
  assert.equal(outcome, false); assert.equal(errorToasts, 1);
  response = { data: { level: 'warn', reason: 'personal_attack' } };
  await React.act(async () => { pending = probe.check('Another draft'); });
  await React.act(async () => root.unmount());
  assert.equal(await pending, false);
});

test('Bluesky callbacks reject mismatched, malformed and expired browser state', () => {
  const valid = { state: 'expected', proof: 'a'.repeat(64), createdAt: 1000, link: false };
  assert.equal(readAtprotoLogin(JSON.stringify(valid), 'expected', 2000).link, false);
  for (const altered of [{ ...valid, createdAt: null }, { ...valid, createdAt: 3000 }, { ...valid, createdAt: -700000 }, { ...valid, proof: 'short' }, { ...valid, state: 'another' }, { ...valid, link: 'false' }]) {
    assert.throws(() => readAtprotoLogin(JSON.stringify(altered), 'expected', 2000));
  }
  assert.throws(() => readAtprotoLogin(null, 'expected', 2000));
  assert.throws(() => readAtprotoLogin('{broken', 'expected', 2000));
});
