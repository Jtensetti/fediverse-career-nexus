import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { createInstance } from 'i18next';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/profile/edit' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver']) globalThis[name] = dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const languages = ['sv', 'en', 'fr', 'de', 'nl', 'es', 'ja', 'it'];
const resources = Object.fromEntries(languages.map(language => [language, {
  translation: JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8')),
}]));
const i18n = createInstance();
await i18n.init({ resources, lng: 'sv', fallbackLng: false, interpolation: { escapeValue: false } });
globalThis.localizationTestI18n = i18n;
globalThis.localizationDeleteCalls = 0;
const mocks = {
  'sonner': 'export const toast={success(){},error(){}};',
  '@/i18n': 'export default globalThis.localizationTestI18n;',
  '@/contexts/AuthContext': 'export const useAuth=()=>({signOut:async()=>{}});',
  '@/services/auth/accountService': 'export const deleteAccount=async()=>{globalThis.localizationDeleteCalls++;return {success:false};};',
  '@/services/moderation/reportService': 'export const submitReport=async()=>true;',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'localization-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const stem = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context.parentURL?.startsWith('localization-mock:') ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith('localization-mock:')) return { format: 'module', source: mocks[url.slice('localization-mock:'.length)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { I18nextProvider } = await import('react-i18next');
const { default: DeleteAccountSection } = await import('../src/components/settings/DeleteAccountSection.tsx');
const { ReportDialog } = await import('../src/components/common/ReportDialog.tsx');
const h = React.createElement;
const act = React.act;
const button = (label, parent = document) => [...parent.querySelectorAll('button')].find(node => node.textContent.trim() === label);

async function render(element, language) {
  await i18n.changeLanguage(language);
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(I18nextProvider, { i18n }, h(MemoryRouter, {}, element))));
  return async () => { await act(async () => root.unmount()); };
}
async function enterConfirmation(value) {
  const input = document.getElementById('delete-confirmation');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('every displayed confirmation word works and still requires acknowledgement and a second confirmation', async () => {
  for (const language of languages) {
    const cleanup = await render(h(DeleteAccountSection), language);
    try {
      const trigger = button(i18n.t('ui.deleteAccountSection.raderaMittKonto'));
      const word = document.getElementById('delete-confirmation').placeholder;
      assert.ok(word.length > 0);
      assert.ok(document.querySelector('label[for="delete-confirmation"]').textContent.includes(word));
      await enterConfirmation(word);
      assert.equal(trigger.disabled, true, `${language}: acknowledgement is required`);
      await act(async () => document.getElementById('understand').click());
      assert.equal(trigger.disabled, false, `${language}: the displayed word must be accepted`);
      await enterConfirmation(word + '!');
      assert.equal(trigger.disabled, true, `${language}: mismatched words must be rejected`);
      await enterConfirmation(word);
      await act(async () => trigger.click());
      assert.ok(document.querySelector('[role="alertdialog"]'), 'the second confirmation remains mandatory');
      assert.equal(globalThis.localizationDeleteCalls, 0);
      await act(async () => button(i18n.t('ui.deleteAccountSection.avbryt'), document.querySelector('[role="alertdialog"]')).click());
      assert.equal(globalThis.localizationDeleteCalls, 0, 'cancelling must not call deletion');
    } finally { await cleanup(); }
  }
});

test('changing language invalidates a previously entered confirmation word', async () => {
  const cleanup = await render(h(DeleteAccountSection), 'sv');
  try {
    await enterConfirmation(document.getElementById('delete-confirmation').placeholder);
    await act(async () => document.getElementById('understand').click());
    await act(async () => i18n.changeLanguage('en'));
    assert.equal(button(i18n.t('ui.deleteAccountSection.raderaMittKonto')).disabled, true);
    await enterConfirmation(document.getElementById('delete-confirmation').placeholder);
    assert.equal(button(i18n.t('ui.deleteAccountSection.raderaMittKonto')).disabled, false);
    assert.equal(globalThis.localizationDeleteCalls, 0);
  } finally { await cleanup(); }
});

test('reports render full localized titles and interpolate untrusted titles as text', async () => {
  for (const language of languages) {
    const cleanup = await render(h(ReportDialog, {
      contentType: 'job', contentId: 'fixture', contentTitle: '<img src=x onerror=alert(1)>', open: true, onOpenChange() {},
    }), language);
    try {
      const dialog = document.querySelector('[role="dialog"]');
      assert.equal(dialog.querySelector('h2').textContent, i18n.t('ui.reportDialog.reportJob'));
      assert.ok(dialog.textContent.includes('<img src=x onerror=alert(1)>'));
      assert.equal(dialog.querySelector('img'), null);
      assert.equal(button(i18n.t('ui.reportDialog.skickaRapport'), dialog).disabled, true, 'a reason remains required');
    } finally { await cleanup(); }
  }
});
