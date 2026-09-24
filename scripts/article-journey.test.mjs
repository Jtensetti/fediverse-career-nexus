import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/articles', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver', 'DOMParser']) globalThis[key] = dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
window.scrollTo = () => {};
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const mocks = {
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.articleTest.translate,i18n:{language:"sv",resolvedLanguage:"sv"}});',
  '@/contexts/AuthContext': 'export const useAuth=()=>({user:globalThis.articleTest.user});',
  '@/lib/supabase': 'export const supabase=globalThis.articleTest.supabase;',
  '@/hooks/useContentCheck': 'export const useContentCheck=()=>({check:async()=>true,checking:false,dialog:null});',
  '@/hooks/use-mobile': 'export const useIsMobile=()=>globalThis.articleTest.mobile;',
  '@/components/layout/Navbar': 'export default ()=>null;',
  '@/components/layout/Footer': 'export default ()=>null;',
  '@/components/common/SEOHead': 'export const SEOHead=globalThis.articleTest.SEOHead;',
  '@/components/common': 'export const SEOHead=globalThis.articleTest.SEOHead; export const ShareButton=()=>null; export const ReportDialog=()=>null;',
  '@/components/content/CoverImageUpload': 'export default ()=>null;',
  '@/components/content/MediaImage': 'export const MediaImage=()=>null;',
  '@/components/content/ArticleContent': 'export const ArticleContent=()=>null;',
  '@/components/content/ContentGate': 'export default ()=>null;',
  '@/components/social/NewsletterSubscribe': 'export default ()=>null;',
  '@/components/articles/ArticleReactions': 'export default ()=>null;',
  '@/components/articles/ArticleEditor': 'export default globalThis.articleTest.FormEditor;',
  '@/services/social/authorFollowService': 'export const canAccessFullArticle=async()=>true;',
  '@/services/articles/articleService': `export const createArticle=async article=>{globalThis.articleTest.saved.push(article);return {id:'created'};};
    export const updateArticle=async(id,article)=>{globalThis.articleTest.saved.push(article);return {id};};
    export const generateSlug=title=>title.toLowerCase().replace(/[^a-z0-9 -]/g,'').replace(/ +/g,'-');
    export const getUserArticles=()=>[]; export const deleteArticle=async()=>true;
    export const getArticleById=()=>null; export const getArticleBySlug=()=>null; export const getArticleAuthors=()=>[];
    export const addCoAuthor=()=>false; export const removeCoAuthor=()=>false; export const searchUsers=()=>[];`,
  '@tanstack/react-query': `export const useQuery=({queryKey})=>({data:globalThis.articleTest.query(queryKey),isLoading:false});
    export const useQueryClient=()=>({invalidateQueries:({queryKey})=>globalThis.articleTest.invalidated.push(queryKey)});`,
  'sonner': 'export const toast={error:message=>globalThis.articleTest.errors.push(message)};',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'article-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const stem = specifier.startsWith('@/') ? new URL('../src/' + specifier.slice(2), import.meta.url) : new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('article-mock:')) return { format: 'module', source: mocks[url.slice(13)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const h = React.createElement;
const original = { id: 'article-1', user_id: 'owner', title: 'En publicerad artikel', slug: 'en-publicerad-artikel', content: '<p>Detta är innehållet i den publicerade artikeln som vi testar här.</p>', excerpt: '', published: true, cover_image_url: null, created_at: '2026-09-24T10:00:00Z', moderation_status: 'published' };
const state = globalThis.articleTest = {
  user: { id: 'owner' }, mobile: false, saved: [], errors: [], invalidated: [], original,
  translate(key, options = {}) {
    const value = key.split('.').reduce((item, part) => item?.[part], translations) ?? (typeof options === 'string' ? options : options.defaultValue) ?? key;
    return value.replace(/{{(\w+)}}/g, (_, field) => options[field] ?? '');
  },
  query(key) {
    if (key[0] === 'article') return state.original;
    if (key[0] === 'article-authors') return [{ id: 'author-1', user_id: 'owner', is_primary: true, can_edit: true, profile: { fullname: 'Test Författare' } }];
    if (key[0] === 'user-articles') return [state.original];
    if (key[0] === 'articleAuthorProfile') return { fullname: 'Test Författare', username: 'test' };
    if (key[0] === 'articleAccess') return true;
  },
  SEOHead: ({ title }) => { React.useEffect(() => { document.title = title; }, [title]); return null; },
  FormEditor: ({ value, onChange }) => h('textarea', { id: 'article-content', 'aria-label': 'Artikelinnehåll', value, onChange: e => onChange(e.target.value) }),
  supabase: { from() { const chain = { select() { return chain; }, eq() { return chain; }, update() { return chain; }, limit: async () => ({ data: [], error: null }) }; return chain; } },
};
const { default: ArticleCreate } = await import('../src/pages/articles/ArticleCreate.tsx');
const { default: ArticleEdit } = await import('../src/pages/articles/ArticleEdit.tsx');
const { default: ArticleManage } = await import('../src/pages/articles/ArticleManage.tsx');
const { default: ArticleView } = await import('../src/pages/articles/ArticleView.tsx');
const { TipTapEditor } = await import('../src/components/editor/TipTapEditor.tsx');
const { RichTextToolbar } = await import('../src/components/editor/RichTextToolbar.tsx');
function Location() { const location = useLocation(); return h('output', { id: 'location' }, location.pathname); }
async function mount(component, path = '/articles/create', route = '*') {
  state.saved = []; state.errors = []; state.invalidated = [];
  const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(h(MemoryRouter, { initialEntries: [path] }, h(Location), h(Routes, null, h(Route, { path: route, element: component })))));
  return () => React.act(async () => root.unmount());
}
async function input(id, value) {
  const element = document.getElementById(id);
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function click(element) { await React.act(async () => element.click()); }
function button(text) { return [...document.querySelectorAll('button')].find(element => element.textContent.trim() === text); }
async function submit() { await React.act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }

test('article creation puts writing first, preserves a custom address, and distinguishes publishing from a draft', async () => {
  state.mobile = false;
  const unmount = await mount(h(ArticleCreate));
  try {
    await input('title', 'Min första artikel');
    assert.equal(document.getElementById('slug').value, 'min-frsta-artikel');
    await input('slug', 'min-egen-adress');
    await input('title', 'Min ändrade titel');
    assert.equal(document.getElementById('slug').value, 'min-egen-adress');
    const fields = [...document.querySelectorAll('input,textarea')].map(element => element.id);
    assert.ok(fields.indexOf('article-content') < fields.indexOf('excerpt'));
    assert.ok(fields.indexOf('article-content') < fields.indexOf('slug'));
    assert.ok(button('Spara utkast'));
    await input('article-content', '<p>Det här är en komplett artikel med mer än femtio synliga tecken.</p>');
    await click(document.getElementById('published'));
    assert.ok(button('Publicera artikel'));
    await submit();
    assert.equal(state.saved.length, 1);
    assert.equal(state.saved[0].published, true);
    assert.equal(state.saved[0].slug, 'min-egen-adress');
    assert.ok(state.invalidated.some(key => key[0] === 'user-articles'));
  } finally { await unmount(); }
});

test('markup cannot pass content validation as visible article text', async () => {
  const unmount = await mount(h(ArticleCreate));
  try {
    await input('title', 'En tom artikel');
    await input('article-content', '<p></p>'.repeat(20));
    await submit();
    assert.equal(state.saved.length, 0);
    assert.ok(document.body.textContent.includes('Skriv minst 50 tecken'));
  } finally { await unmount(); }
});

test('editing a title preserves a shared article URL and unpublishing is explicit', async () => {
  state.original = original;
  const unmount = await mount(h(ArticleEdit), '/articles/edit/article-1', '/articles/edit/:id');
  try {
    assert.equal(document.title, 'Redigera artikel');
    await input('title', 'En helt ny titel');
    assert.equal(document.getElementById('slug').value, original.slug);
    assert.ok(button('Spara ändringar'));
    await click(document.getElementById('published'));
    assert.ok(button('Avpublicera och spara utkast'));
    await submit();
    assert.equal(state.saved[0].published, false);
    assert.equal(state.saved[0].slug, original.slug);
    assert.ok(state.invalidated.some(key => key[0] === 'article' && key.length === 1));
  } finally { await unmount(); }
});

test('article management has named actions, Swedish copy, and a Swedish date', async () => {
  const unmount = await mount(h(ArticleManage));
  try {
    assert.equal(document.querySelector('h1').textContent.trim(), 'Mina artiklar');
    assert.ok(button('Ny artikel'));
    assert.ok(document.querySelector('button[aria-label="Redigera En publicerad artikel"]'));
    assert.ok(document.querySelector('button[aria-label="Ta bort En publicerad artikel"]'));
    assert.ok(document.body.textContent.includes('24 sep. 2026'));
  } finally { await unmount(); }
});

test('the author can edit from the reading view; other readers cannot', async () => {
  state.user = { id: 'owner' };
  let unmount = await mount(h(ArticleView), '/articles/en-publicerad-artikel', '/articles/:slug');
  try {
    assert.equal(document.querySelector('a[href="/articles/edit/article-1"]').textContent.trim(), 'Redigera artikel');
    assert.ok(document.body.textContent.includes('24 september 2026'));
  } finally { await unmount(); }
  state.user = { id: 'reader' };
  unmount = await mount(h(ArticleView), '/articles/en-publicerad-artikel', '/articles/:slug');
  try { assert.equal(document.querySelector('a[href="/articles/edit/article-1"]'), null); }
  finally { await unmount(); state.user = { id: 'owner' }; }
});

test('rich text editor exposes a named textbox and inserts actual, escaped link text', async () => {
  const editorRef = React.createRef();
  let result = '';
  const unmount = await mount(h(TipTapEditor, { ref: editorRef, value: '', onChange: html => { result = html; }, id: 'actual-content' }));
  try {
    const textbox = document.querySelector('[contenteditable="true"]');
    assert.equal(textbox.getAttribute('role'), 'textbox');
    assert.equal(textbox.getAttribute('aria-label'), 'Artikelinnehåll');
    assert.equal(textbox.getAttribute('aria-multiline'), 'true');
    await React.act(async () => editorRef.current.setLink('https://nolto.social', 'Nolto <test>'));
    assert.ok(result.includes('href="https://nolto.social"'));
    assert.ok(result.includes('Nolto &lt;test&gt;'));
  } finally { await unmount(); }
});

test('toolbar exposes Swedish control names and still invokes the editing action', async () => {
  const actions = [];
  const unmount = await mount(h(RichTextToolbar, { hasSelection: true, isMobile: false, onAction: action => actions.push(action) }));
  try {
    await click(document.querySelector('button[aria-label="Fetstil"]'));
    assert.deepEqual(actions, ['bold']);
    assert.ok(document.querySelector('button[aria-label="Infoga länk"]'));
    assert.ok(document.querySelector('button[aria-label="Textformat"]'));
  } finally { await unmount(); }
});
