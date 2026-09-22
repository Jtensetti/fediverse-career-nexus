import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/profile' });
for (const name of ['window', 'document', 'HTMLElement', 'Node', 'NodeFilter', 'Event', 'MouseEvent']) globalThis[name] = dom.window[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
globalThis.profileTestTranslate = key => key.split('.').reduce((object, part) => object?.[part], translations) ?? key;
const mocks = {
  '@/lib/supabase': 'export const supabase = globalThis.profileTestBackend;',
  '@/lib/media': `export const publicMediaUrl=(bucket,path)=>'https://media.example.invalid/'+bucket+'/'+path; export const isNoltoMedia=()=>false; export const fetchOwnMedia=async()=>null;`,
  '@/contexts/AuthContext': 'export const useAuth=()=>({user:null});',
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.profileTestTranslate});',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'test-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const stem = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('test-mock:')) return { format: 'module', source: mocks[url.slice(10)], shortCircuit: true };
    if (url.endsWith('.css')) return { format: 'module', source: '', shortCircuit: true };
    if (/\.tsx$/.test(url)) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
let uploads, removals, writes, failWrite, failRead, committedDespiteError;
const media = path => 'https://media.example.invalid/avatars/' + path;
globalThis.profileTestBackend = {
  auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) },
  storage: { from: () => ({ upload: async path => { uploads.push(path); return {}; }, remove: async paths => { removals.push(...paths); return {}; } }) },
  from: () => ({
    update: fields => ({ eq: (_key, id) => ({ select: () => ({ single: async () => {
      writes.push({ fields, id }); return failWrite ? { error: new Error('Write failed') } : { data: { id } };
    } }) }) }),
    select: () => ({ eq: () => ({ single: async () => failRead ? { error: new Error('Read failed') } : { data: {
      avatar_url: committedDespiteError ? media(uploads[0]) : 'previous-avatar', header_url: 'previous-header',
    } } }) }),
  }),
};
const { saveProfileAppearance } = await import('../src/services/profile/profileAppearanceService.ts');
const draft = { fullname: 'Test Person', headline: '', bio: 'Hello', location: '' };
function reset() { uploads = []; removals = []; writes = []; failWrite = false; failRead = false; committedDespiteError = false; }

test('appearance save validates before uploading and saves only the authenticated profile', async () => {
  reset();
  await assert.rejects(saveProfileAppearance({ ...draft, fullname: '' }, { avatar: new File(['x'], 'x.jpg', { type: 'image/jpeg' }) }));
  assert.equal(uploads.length, 0);
  await assert.rejects(saveProfileAppearance(draft, { avatar: new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }) }));
  assert.equal(uploads.length, 0);
  await saveProfileAppearance(draft, { avatar: new File(['jpeg'], 'x.jpg', { type: 'image/jpeg' }), header: null });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].id, 'owner');
  assert.equal(writes[0].fields.header_url, null);
  assert.equal(writes[0].fields.avatar_url, media(uploads[0]));
});

test('failed save cleans up unused uploads, but never a possibly committed image', async () => {
  const image = new File(['jpeg'], 'x.jpg', { type: 'image/jpeg' });
  reset(); failWrite = true;
  await assert.rejects(saveProfileAppearance(draft, { avatar: image }));
  assert.deepEqual(removals, uploads);
  reset(); failWrite = true; committedDespiteError = true;
  await assert.rejects(saveProfileAppearance(draft, { avatar: image }));
  assert.deepEqual(removals, []);
  reset(); failWrite = true; failRead = true;
  await assert.rejects(saveProfileAppearance(draft, { avatar: image }));
  assert.deepEqual(removals, []);
});

test('inline editing previews unsaved text, preserves it after failure and only saves on explicit submit', async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { MemoryRouter } = await import('react-router-dom');
  const { default: Editor } = await import('../src/components/profile/ProfileInlineEditor.tsx');
  const root = createRoot(document.getElementById('root'));
  let saved, cancelCount = 0, failure = true;
  const onSave = async values => { if (failure) throw new Error('Offline'); saved = values; };
  const act = React.act;
  await act(async () => root.render(React.createElement(MemoryRouter, {}, React.createElement(Editor, {
    profile: { id: 'owner', username: 'test_person', displayName: 'Test Person', bio: 'Original biography' },
    onSave, onCancel: () => cancelCount++,
  }))));
  function button(label) { return [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label || node.getAttribute('aria-label') === label); }
  await act(async () => button(translations.profileEdit.bio).click());
  const textarea = document.querySelector('textarea');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'A longer draft biography\nwith a second line');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  });
  assert.equal(saved, undefined);
  await act(async () => button(translations.profileInline.preview).click());
  assert.match(document.body.textContent, /A longer draft biography/);
  await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.match(document.querySelector('[role="alert"]').textContent, /Kunde inte spara/);
  assert.match(document.body.textContent, /A longer draft biography/);
  failure = false;
  await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  assert.equal(saved.bio, 'A longer draft biography\nwith a second line');
  await act(async () => button(translations.common.cancel).click());
  assert.equal(cancelCount, 1);
  await act(async () => root.unmount());
});
