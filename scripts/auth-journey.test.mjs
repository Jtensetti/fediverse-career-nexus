import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import i18next from 'i18next';
import { Trans as RealTrans } from 'react-i18next';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/auth/signup', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'NodeFilter', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver', 'getComputedStyle', 'localStorage', 'sessionStorage', 'requestAnimationFrame', 'cancelAnimationFrame']) globalThis[key] = dom.window[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const authI18n = i18next.createInstance();
await authI18n.init({ lng: 'sv', resources: { sv: { translation: translations } }, interpolation: { escapeValue: false } });
globalThis.authTestTranslate = (key, options) => {
  let value = key.split('.').reduce((part, name) => part?.[name], translations) ?? (typeof options === 'string' ? options : key);
  if (typeof value !== 'string') return key;
  for (const [name, replacement] of Object.entries(typeof options === 'object' ? options : {})) value = value.replaceAll('{{' + name + '}}', String(replacement));
  return value;
};
const mocks = {
  '@/lib/supabase': 'export const supabase = {functions:{invoke:(...args)=>globalThis.authTestBackend.invoke(...args)}, auth:{signInWithPassword:(...args)=>globalThis.authTestBackend.signIn(...args)}, rpc: async()=>({data:true})};',
  '@/contexts/AuthContext': 'export const useAuth = () => globalThis.authTestSession;',
  '@/services/social/referralService': 'export const processReferralCode = async()=>{};',
  '@/lib/appAuthorizationReturn': 'export const consumeAppAuthorization = ()=>{globalThis.authConsentReads++;return null;};',
  '@/components/auth/SocialSignIn': 'export default ()=>globalThis.authTestReact.createElement(globalThis.authTestReact.Fragment,null,...["Google","Apple"].map(name=>globalThis.authTestReact.createElement("button",{key:name,type:"button"},name)));',
  '@/components/auth/BlueskySignIn': 'export default ()=>globalThis.authTestReact.createElement("button",{type:"button","data-testid":"bluesky"},"Bluesky");',
  '@/components/common/SEOHead': 'export const SEOHead=()=>null;',
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.authTestTranslate}); export const Trans=props=>globalThis.authTestRenderTrans(props);',
  'sonner': 'export const toast={error:()=>{},success:()=>{},warning:()=>{}};',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'auth-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('auth-mock:')) return { format: 'module', source: mocks[url.slice(10)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
globalThis.authTestReact = React;
globalThis.authTestRenderTrans = props => React.createElement(RealTrans, { ...props, i18n: authI18n });
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, useLocation, useNavigate } = await import('react-router-dom');
const { default: Auth } = await import('../src/pages/auth/Auth.tsx');
let location, navigate, calls, signupResponse, signInResponse;
globalThis.authTestBackend = {
  invoke: async (name, options) => {
    calls.push({ name, body: options.body });
    return options.body.action === 'resend' ? { data: { success: true } } : signupResponse;
  },
  signIn: async body => { calls.push({ name: 'signIn', body }); return signInResponse; },
};
function Probe() { location = useLocation(); navigate = useNavigate(); return React.createElement(Auth); }
async function mount(path = '/auth/signup?ref=ABC', state = { returnTo: '/settings/apps' }) {
  calls = []; signupResponse = { data: { success: true, emailSent: true } }; signInResponse = {};
  globalThis.authConsentReads = 0;
  globalThis.authTestSession = { user: null, session: null, loading: false, mfaPending: false };
  const root = createRoot(document.getElementById('root'));
  const tree = () => React.createElement(MemoryRouter, { initialEntries: [{ pathname: path.split('?')[0], search: path.includes('?') ? '?' + path.split('?')[1] : '', state }] }, React.createElement(Probe));
  await React.act(async () => root.render(tree()));
  return { rerender: async () => { await React.act(async () => root.render(tree())); }, unmount: async () => { await React.act(async () => root.unmount()); } };
}
async function input(id, value) {
  await React.act(async () => {
    const node = document.getElementById(id);
    assert.ok(node, id + ' should be present');
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(node, value);
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submitAt(id) {
  await React.act(async () => document.getElementById(id).closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
}
async function chooseTab(name) {
  const trigger = [...document.querySelectorAll('[role="tab"]')].find(node => node.textContent === name);
  await React.act(async () => trigger.dispatchEvent(new MouseEvent('mousedown', { button: 0, bubbles: true })));
}
async function fillSignup(username = 'new_person') {
  await input('signup-firstname', 'Test'); await input('signup-lastname', 'Person');
  await input('signup-username', username); await input('signup-email', 'new@example.test');
  await input('signup-password', 'synthetic-passphrase-123');
}

test('email method has only its own form, tabs preserve referral and return route', async t => {
  const fixture = await mount(); t.after(fixture.unmount);
  assert.ok(document.querySelector('a[href="/terms"]')?.textContent);
  assert.ok(document.querySelector('a[href="/privacy"]')?.textContent);
  assert.ok(document.getElementById('signup-email'));
  assert.equal(document.getElementById('mastodon-handle'), null);
  assert.equal(document.querySelector('[data-testid="bluesky"]'), null);
  assert.equal(document.getElementById('signup-username').required, true);
  assert.doesNotMatch(document.body.textContent, /auth\.username|optional|organisationskonto/);
  await chooseTab(translations.auth.signIn);
  assert.equal(location.pathname, '/auth/login');
  assert.equal(location.search, '?ref=ABC');
  assert.equal(location.state.returnTo, '/settings/apps');
  assert.ok(document.getElementById('signin-email'));
  await React.act(async () => navigate(-1));
  assert.equal(location.pathname, '/auth/signup');
  assert.ok(document.getElementById('signup-email'));
});

test('auth starts with five methods and exposes one chosen form at a time', async t => {
  const fixture = await mount('/auth?ref=ABC'); t.after(fixture.unmount);
  const methods = document.querySelector('section[aria-label]');
  assert.equal(methods.querySelectorAll('button').length, 5);
  assert.equal(document.querySelector('form'), null);
  const clickText = async text => React.act(async () => [...document.querySelectorAll('button')].find(button => button.textContent.includes(text)).click());
  await clickText('Mastodon');
  assert.match(location.search, /method=mastodon/);
  assert.ok(document.getElementById('mastodon-handle'));
  assert.equal(document.getElementById('signin-email'), null);
  await clickText(translations.auth.allMethods);
  assert.equal(document.querySelector('form'), null);
  await clickText(translations.auth.continueEmail);
  assert.equal(location.pathname, '/auth/login');
  assert.equal(location.search, '?ref=ABC');
  assert.equal(location.state.returnTo, '/settings/apps');
  assert.ok(document.getElementById('signin-email'));
});

test('invalid username remains visible, blocks submission and has an associated inline error', async t => {
  const fixture = await mount(); t.after(fixture.unmount);
  await fillSignup('new-person');
  assert.equal(document.getElementById('signup-username').value, 'new-person');
  await submitAt('signup-email');
  assert.equal(calls.length, 0);
  assert.equal(document.getElementById('signup-username').getAttribute('aria-invalid'), 'true');
  assert.match(document.getElementById('signup-username-status').textContent, /små bokstäver, siffror och understreck/);
  assert.equal(document.activeElement.id, 'signup-username');
  await input('signup-username', '');
  await submitAt('signup-email');
  assert.match(document.body.textContent, /Användarnamn krävs/);
  assert.equal(calls.length, 0);
});

test('successful signup keeps confirmation visible, clears password and prefills resend and sign-in', async t => {
  const fixture = await mount(); t.after(fixture.unmount);
  await fillSignup();
  await submitAt('signup-email');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].body.username, 'new_person');
  assert.equal(document.getElementById('signup-password'), null);
  assert.match(document.body.textContent, /Ditt konto är skapat med new@example\.test/);
  assert.equal(document.getElementById('confirmation-email').value, 'new@example.test');
  await fixture.rerender();
  assert.ok(document.getElementById('confirmation-title'));
  await submitAt('confirmation-email');
  assert.deepEqual(calls[1], { name: 'auth-signup', body: { action: 'resend', email: 'new@example.test' } });
  const signIn = [...document.querySelectorAll('button')].find(node => node.textContent === translations.auth.confirmationSignIn);
  await React.act(async () => signIn.click());
  assert.equal(location.pathname, '/auth/login');
  assert.equal(location.search, '?ref=ABC');
  assert.equal(location.state.returnTo, '/settings/apps');
  assert.equal(document.getElementById('signin-email').value, 'new@example.test');
  assert.equal(document.getElementById('signin-password').value, '');
});

test('delivery failure remains a created account and login errors stay inline', async t => {
  const fixture = await mount(); t.after(fixture.unmount);
  signupResponse = { data: { success: true, emailSent: false } };
  await fillSignup(); await submitAt('signup-email');
  assert.ok(document.getElementById('confirmation-title'));
  assert.match(document.querySelector('[role="alert"]').textContent, /mejlet kunde inte skickas/);
  const signIn = [...document.querySelectorAll('button')].find(node => node.textContent === translations.auth.confirmationSignIn);
  await React.act(async () => signIn.click());
  signInResponse = { error: { code: 'invalid_credentials', message: 'Raw provider diagnostic' } };
  await input('signin-password', 'synthetic-incorrect-password'); await submitAt('signin-email');
  assert.match(document.querySelector('[role="alert"]').textContent, /E-postadressen eller lösenordet stämmer inte/);
  assert.doesNotMatch(document.body.textContent, /Raw provider diagnostic/);
});

test('successful password sign-in waits for AuthProvider MFA before consuming the return route', async t => {
  const fixture = await mount('/auth/login', { returnTo: '/settings/apps' }); t.after(fixture.unmount);
  await input('signin-email', 'existing@example.test'); await input('signin-password', 'synthetic-password');
  await submitAt('signin-email');
  globalThis.authTestSession = { user: null, session: { user: { id: 'synthetic-user' } }, loading: false, mfaPending: true };
  await fixture.rerender();
  assert.equal(location.pathname, '/auth/login'); assert.equal(globalThis.authConsentReads, 0);
  globalThis.authTestSession = { user: { id: 'synthetic-user' }, session: {}, loading: false, mfaPending: false };
  await fixture.rerender();
  assert.equal(location.pathname, '/settings/apps'); assert.equal(globalThis.authConsentReads, 1);
});
