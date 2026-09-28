// Renders the real ConfirmEmail page with an isolated backend invoke and memory router.
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/' });
for (const name of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'MutationObserver']) globalThis[name] = dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
globalThis.confirmTestT = key => key.split('.').reduce((o, p) => o?.[p], translations) ?? key;
globalThis.confirmTestT.stable = true;
globalThis.confirmCalls = [];
const mocks = {
  'sonner': 'export const toast={success(){},error(){}};',
  'react-i18next': 'const t=globalThis.confirmTestT; export const useTranslation=()=>({t,i18n:{language:"sv"}});',
  '@/lib/supabase': 'export const supabase={functions:{invoke:async(name,opts)=>{globalThis.confirmCalls.push({name,opts});return globalThis.confirmReply(opts);}}};',
  '@/components/common/SEOHead': 'export const SEOHead=()=>null;',
  '@/components/auth/ResendConfirmation': 'export default function ResendConfirmation(){return null;}',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'confirm-mock:' + specifier, shortCircuit: true };
    const base = specifier.startsWith('@/') ? new URL('../src/' + specifier.slice(2), import.meta.url)
      : specifier.startsWith('.') && context.parentURL?.startsWith('file:') ? new URL(specifier, context.parentURL) : null;
    if (base) for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(base) + suffix)) return { url: base.href + suffix, shortCircuit: true };
    return next(specifier, context.parentURL?.startsWith('confirm-mock:') ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith('confirm-mock:')) return { format: 'module', source: mocks[url.slice(13)], shortCircuit: true };
    if (/\.tsx$/.test(url)) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText };
    return next(url, context);
  },
});

const React = await import('react');
const { act } = React;
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider } = await import('react-router-dom');
const { default: ConfirmEmail } = await import('../src/pages/auth/ConfirmEmail.tsx');

async function render(path, reply) {
  globalThis.confirmCalls = [];
  globalThis.confirmReply = reply;
  const container = document.createElement('div');
  document.body.append(container);
  const router = createMemoryRouter([{ path: '/confirm-email', element: React.createElement(ConfirmEmail) },
    { path: '/auth', element: React.createElement('p', null, 'auth page') }], { initialEntries: [path] });
  const root = createRoot(container);
  await act(async () => { root.render(React.createElement(RouterProvider, { router })); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  return { container, router, cleanup: () => { act(() => root.unmount()); container.remove(); } };
}
const t = globalThis.confirmTestT;
const TOKEN = '3f1c6a52-8e4b-4d2a-9c71-0b5e9a7d2f10';

test('the emailed ?token= is sent unchanged to auth-confirm-email and success leads to sign-in', async () => {
  const view = await render(`/confirm-email?token=${TOKEN}`, async () => ({ data: { success: true }, error: null }));
  assert.deepEqual(globalThis.confirmCalls, [{ name: 'auth-confirm-email', opts: { body: { token: TOKEN } } }]);
  assert.match(view.container.textContent, new RegExp(t('confirmEmail.confirmed')));
  const button = [...view.container.querySelectorAll('button')].find(b => b.textContent === t('confirmEmail.continueToSignIn'));
  await act(async () => { button.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
  assert.equal(view.router.state.location.pathname, '/auth');
  view.cleanup();
});

test('missing token never calls the backend', async () => {
  const view = await render('/confirm-email', async () => { throw new Error('must not be called'); });
  assert.equal(globalThis.confirmCalls.length, 0);
  assert.match(view.container.textContent, new RegExp(t('confirmEmail.noToken')));
  view.cleanup();
});

test('expired and failing confirmations show honest states', async () => {
  const expired = await render(`/confirm-email?token=${TOKEN}`, async () => ({ data: null,
    error: { context: { json: async () => ({ error: 'Token expired' }) } } }));
  assert.match(expired.container.textContent, new RegExp(t('confirmEmail.linkExpired')));
  expired.cleanup();
  const failed = await render(`/confirm-email?token=${TOKEN}`, async () => ({ data: null,
    error: { context: { json: async () => ({ error: 'Invalid token' }) } } }));
  assert.match(failed.container.textContent, new RegExp(t('confirmEmail.failed')));
  assert.doesNotMatch(failed.container.textContent, new RegExp(t('confirmEmail.confirmed')));
  failed.cleanup();
});
