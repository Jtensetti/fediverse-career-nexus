import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/edit', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
HTMLElement.prototype.scrollIntoView = () => {};
const sv = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
globalThis.uxTranslate = key => key.split('.').reduce((value, part) => value?.[part], sv) ?? key;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'react-i18next') return { url: 'ux-i18n:', shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'ux-i18n:') return { format: 'module', shortCircuit: true, source: 'export const useTranslation=()=>({t:globalThis.uxTranslate});' };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { createMemoryRouter, RouterProvider, Outlet, Link, useNavigate } = await import('react-router-dom');
const { UnsavedChangesProvider } = await import('../src/contexts/UnsavedChangesContext.tsx');
const { useUnsavedChanges } = await import('../src/hooks/useUnsavedChanges.ts');
const { default: JobSearchFilter } = await import('../src/components/jobs/JobSearchFilter.tsx');
const { default: QueryFeedback } = await import('../src/components/common/QueryFeedback.tsx');
const h = React.createElement;
const { act } = React;
const translate = globalThis.uxTranslate;
const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text);

function Editor({ name = 'Draft', ignoreQueryChanges = false }) {
  const [value, setValue] = React.useState('');
  const [error, setError] = React.useState(false);
  const navigate = useNavigate();
  const guard = useUnsavedChanges({ dirty: !!value, message: translate('ux.leaveDescription'), ignoreQueryChanges });
  return h('section', {},
    h('textarea', { 'aria-label': name, value, onChange: event => setValue(event.target.value) }),
    h(Link, { to: '/list' }, 'Leave ' + name),
    h(Link, { to: '/edit?tab=details' }, 'Tab ' + name),
    h('button', { onClick: () => guard.afterSave(() => navigate('/list')) }, 'Saved ' + name),
    h('button', { onClick: () => setError(true) }, 'Failed ' + name),
    error && h('p', { role: 'alert' }, 'Save not confirmed'),
  );
}
async function mount(element = h(Editor)) {
  const router = createMemoryRouter([{ path: '/', element: h(UnsavedChangesProvider, {}, h(Outlet)), children: [
    { path: 'edit', element }, { path: 'list', element: h('h1', {}, 'List') },
  ] }], { initialEntries: ['/list', '/edit'], initialIndex: 1 });
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(RouterProvider, { router })));
  return { router, cleanup: async () => { await act(async () => root.unmount()); router.dispose(); } };
}
async function type(value, index = 0) {
  const input = document.querySelectorAll('textarea')[index];
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(node) { await act(async () => { node.focus(); node.click(); }); }

test('untouched editors navigate freely and do not register a reload warning', async () => {
  const view = await mount();
  try {
    assert.equal(window.dispatchEvent(new Event('beforeunload', { cancelable: true })), true);
    await act(async () => view.router.navigate('/list'));
    assert.equal(view.router.state.location.pathname, '/list');
    assert.equal(document.querySelector('[role="alertdialog"]'), null);
  } finally { await view.cleanup(); }
});

test('browser back can be cancelled without changing the location or losing text', async () => {
  const view = await mount();
  try {
    await type('My private draft');
    document.querySelector('textarea').focus();
    assert.equal(window.dispatchEvent(new Event('beforeunload', { cancelable: true })), false);
    await act(async () => view.router.navigate(-1));
    assert.ok(document.querySelector('[role="alertdialog"]'));
    assert.equal(document.activeElement.textContent, translate('ux.keepEditing'));
    await click(button(translate('ux.keepEditing')));
    assert.equal(view.router.state.location.pathname, '/edit');
    assert.equal(document.querySelector('textarea').value, 'My private draft');
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    assert.equal(document.activeElement.tagName, 'TEXTAREA');
    assert.equal(window.localStorage.length, 0);
    assert.equal(window.sessionStorage.length, 0);
  } finally { await view.cleanup(); }
});

test('discard performs the blocked navigation and confirmed saves bypass the dirty-render race', async () => {
  let view = await mount();
  try {
    await type('Draft');
    await click(document.querySelector('a'));
    await click(button(translate('ux.discardAndLeave')));
    assert.equal(view.router.state.location.pathname, '/list');
  } finally { await view.cleanup(); }
  view = await mount();
  try {
    await type('Saved on server, still dirty until React commits');
    await click(button('Saved Draft'));
    assert.equal(view.router.state.location.pathname, '/list');
    assert.equal(document.querySelector('[role="alertdialog"]'), null);
  } finally { await view.cleanup(); }
});

test('a failed save and multiple mounted editors keep one working navigation guard', async () => {
  const view = await mount(h(React.Fragment, {}, h(Editor), h(Editor, { name: 'Second' })));
  try {
    await type('Keep this');
    await click(button('Failed Draft'));
    await act(async () => view.router.navigate('/list'));
    assert.equal(document.querySelectorAll('[role="alertdialog"]').length, 1);
    await click(button(translate('ux.keepEditing')));
    assert.equal(document.querySelector('textarea').value, 'Keep this');
  } finally { await view.cleanup(); }
});

test('profile-style tabs may change the URL while preserving their mounted draft', async () => {
  const view = await mount(h(Editor, { ignoreQueryChanges: true }));
  try {
    await type('Keep across profile tabs');
    await click(document.querySelectorAll('a')[1]);
    assert.equal(view.router.state.location.search, '?tab=details');
    assert.equal(document.querySelector('[role="alertdialog"]'), null);
    assert.equal(document.querySelector('textarea').value, 'Keep across profile tabs');
    await act(async () => view.router.navigate('/list'));
    assert.ok(document.querySelector('[role="alertdialog"]'));
  } finally { await view.cleanup(); }
});

test('job filter drafts survive equivalent parent rerenders and have persistent labels', async () => {
  const root = createRoot(document.getElementById('root'));
  const render = async filters => act(async () => root.render(h(JobSearchFilter, { filters, onFilterChange() {} })));
  try {
    await render({ search: 'original' });
    const input = document.getElementById('job-search');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'still typing');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await render({ search: 'original' });
    assert.equal(input.value, 'still typing');
    for (const id of ['job-search', 'job-location', 'job-type']) assert.ok(document.querySelector(`label[for="${id}"]`));
    assert.ok(document.querySelector('[role="checkbox"]'));
    await render({ search: 'back from detail' });
    assert.equal(input.value, 'back from detail');
  } finally { await act(async () => root.unmount()); }
});

test('background refresh errors expose retry while retaining already loaded content', async () => {
  const root = createRoot(document.getElementById('root'));
  let retries = 0;
  try {
    await act(async () => root.render(h('main', {}, h(QueryFeedback, { failed: true, hasData: true, busy: false, retry: () => retries++ }), h('p', {}, 'Previously loaded job'))));
    assert.ok(document.querySelector('[role="alert"]').textContent.includes(translate('ux.refreshFailed')));
    assert.ok(document.body.textContent.includes('Previously loaded job'));
    await click(button(translate('common.retry')));
    assert.equal(retries, 1);
    await act(async () => root.render(h(QueryFeedback, { failed: true, hasData: true, busy: true, retry: () => retries++ })));
    assert.equal(document.querySelector('button').disabled, true);
  } finally { await act(async () => root.unmount()); }
});

test('light and dark semantic token pairs meet text and control-boundary contrast targets', () => {
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
  const luminance = value => {
    const [hue, sat, light] = value.match(/[\d.]+/g).map(Number);
    const l = light / 100, a = sat / 100 * Math.min(l, 1 - l);
    const channel = n => { const k = (n + hue / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return [channel(0), channel(8), channel(4)].map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  };
  for (const theme of [':root', '.dark']) {
    const block = css.slice(css.indexOf(theme + ' {')).split('}')[0];
    const tokens = Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2]]));
    const ratio = (a, b) => { const x = luminance(tokens[a]), y = luminance(tokens[b]); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    for (const [fg, bg] of [['foreground', 'background'], ['muted-foreground', 'muted'], ...['primary', 'secondary', 'accent', 'destructive', 'success', 'warning', 'info'].map(role => [role + '-foreground', role])]) assert.ok(ratio(fg, bg) >= 4.5, `${theme} ${fg}/${bg}: ${ratio(fg,bg)}`);
    for (const role of ['destructive', 'success', 'warning', 'info']) assert.ok(ratio(role, 'background') >= 4.5, `${theme} text-${role}: ${ratio(role,'background')}`);
    assert.ok(ratio('input', 'background') >= 3, `${theme} input boundary`);
  }
});
