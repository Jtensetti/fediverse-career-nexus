import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/events/test-event' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver', 'FileList']) globalThis[name] = dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const translate = key => key.split('.').reduce((object, part) => object?.[part], translations) ?? key;
globalThis.eventsTestTranslate = translate;
const mocks = {
  'sonner': 'export const toast={success(){},error(){}};',
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.eventsTestTranslate,i18n:{language:"sv"}});',
  '@/i18n': 'export default {language:"sv",resolvedLanguage:"sv",t:(k,v)=>globalThis.eventsTestTranslate(k,v),on(){}}; export const changeLanguage=async()=>{};',
  '@/lib/supabase': 'export const supabase={auth:{getSession:async()=>({data:{session:{user:{id:"owner"}}}})}};',
  '@/lib/linkify': 'export const linkifyText=text=>text;',
  '@/services/misc/eventService': `export const getEvent=async()=>globalThis.eventsTestEvent;
    export const updateEvent=async(_id,data)=>({...globalThis.eventsTestEvent,...data});
    export const createEvent=async(data)=>({...globalThis.eventsTestEvent,...data});
    export const deleteEvent=async()=>{globalThis.eventsTestDeleteCalls++;return globalThis.eventsTestDeleteResult;};
    export const createRSVP=async()=>null; export const downloadICalFile=()=>{};`,
  '@/components/layout/Navbar': 'export default function Navbar(){return null;}',
  '@/components/layout/Footer': 'export default function Footer(){return null;}',
  '@/components/common/SEOHead': 'export const SEOHead=()=>null;',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'events-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const stem = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context.parentURL?.startsWith('events-mock:') ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith('events-mock:')) return { format: 'module', source: mocks[url.slice(12)], shortCircuit: true };
    if (/\.tsx$/.test(url)) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route, useLocation } = await import('react-router-dom');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { default: EventForm } = await import('../src/components/events/EventForm.tsx');
const { default: EventCreate } = await import('../src/pages/events/EventCreate.tsx');
const { default: EventEdit } = await import('../src/pages/events/EventEdit.tsx');
const { default: EventView } = await import('../src/pages/events/EventView.tsx');
const h = React.createElement;
const act = React.act;
const fixture = {
  id: 'test-event', user_id: 'owner', title: 'Original event title', description: 'A test event with a clear description.',
  start_date: '2099-09-24T10:00:00Z', end_date: '2099-09-24T11:00:00Z', location: 'Stockholm',
  is_online: true, meeting_url: 'https://example.invalid/meeting', cover_image_url: 'https://example.invalid/cover.jpg',
  max_attendees: null, visibility: 'private', rsvp_count: 7, user_rsvp_status: 'attending',
};
function Location() { const location = useLocation(); return h('output', { 'data-location': true }, location.pathname); }
function routes() { return h(React.Fragment, {}, h(Location), h(Routes, {},
  h(Route, { path: '/events/edit/:id', element: h(EventEdit) }),
  h(Route, { path: '/events/create', element: h(EventCreate) }),
  h(Route, { path: '/events/:id', element: h(EventView) }),
  h(Route, { path: '/events', element: h('h1', {}, 'Events list') }),
)); }
async function render(component, path = '/events/test-event', seed = true) {
  globalThis.eventsTestEvent = { ...fixture };
  globalThis.eventsTestDeleteCalls = 0;
  const root = createRoot(document.getElementById('root'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: 60_000 }, mutations: { retry: false, gcTime: Infinity } } });
  if (seed) client.setQueryData(['event', fixture.id], { ...fixture });
  client.setQueryData(['events', 'upcoming'], [fixture]);
  await act(async () => root.render(h(QueryClientProvider, { client }, h(MemoryRouter, { initialEntries: [path] }, component))));
  await flush();
  return { client, cleanup: async () => { await act(async () => root.unmount()); client.clear(); } };
}
async function flush() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); }
async function setInput(name, value) {
  const input = document.querySelector(`[name="${name}"]`);
  await act(async () => {
    const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function submit() {
  await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await flush();
}
function button(label, root = document) { return [...root.querySelectorAll('button')].find(node => node.textContent.trim() === label); }

test('removing optional event URLs saves null and hidden offline meeting fields do not block saving', async () => {
  let submitted;
  const view = await render(h(EventForm, { defaultValues: fixture, onSubmit: values => { submitted = values; }, isSubmitting: false }));
  try {
    await setInput('cover_image_url', '');
    await setInput('meeting_url', '');
    await submit();
    assert.equal(submitted.cover_image_url, null);
    assert.equal(submitted.meeting_url, null);
    submitted = undefined;
    await setInput('meeting_url', 'unfinished-link');
    await submit();
    assert.equal(submitted, undefined, 'an invalid visible meeting URL must still be rejected');
    await act(async () => document.querySelector('[role="switch"]').click());
    await submit();
    assert.equal(submitted.is_online, false);
    assert.equal(submitted.meeting_url, null);
  } finally { await view.cleanup(); }
});

test('editing an event immediately shows the saved data despite a fresh detail cache', async () => {
  const view = await render(routes(), '/events/edit/test-event');
  try {
    await setInput('title', 'Updated event title');
    await submit();
    assert.equal(document.querySelector('[data-location]').textContent, '/events/test-event');
    assert.equal(document.querySelector('h1').textContent, 'Updated event title');
    assert.equal(view.client.getQueryData(['event', fixture.id]).rsvp_count, 7);
    assert.equal(view.client.getQueryData(['event', fixture.id]).user_rsvp_status, 'attending');
    assert.equal(view.client.getQueryState(['events', 'upcoming']).isInvalidated, true);
  } finally { await view.cleanup(); }
});

test('creating an event invalidates a previously loaded event list', async () => {
  const view = await render(routes(), '/events/create', false);
  try {
    await setInput('title', 'New event title');
    await setInput('description', 'A sufficiently long description for this event.');
    await submit();
    assert.equal(document.querySelector('[data-location]').textContent, '/events/test-event');
    assert.equal(document.querySelector('h1').textContent, 'New event title');
    assert.equal(view.client.getQueryState(['events', 'upcoming']).isInvalidated, true);
  } finally { await view.cleanup(); }
});

test('failed event deletion keeps the confirmation open and only successful deletion leaves the detail page', async () => {
  globalThis.eventsTestDeleteResult = false;
  const view = await render(routes());
  try {
    await act(async () => button(translate('eventView.deleteEvent')).click());
    await act(async () => button(translate('common.delete'), document.querySelector('[role="alertdialog"]')).click());
    await flush();
    assert.equal(globalThis.eventsTestDeleteCalls, 1);
    assert.equal(document.querySelector('[data-location]').textContent, '/events/test-event');
    assert.equal(document.querySelector('[role="alert"]').textContent, translate('toasts.eventDeleteFailed'));
    assert.ok(document.querySelector('[role="alertdialog"]'));
    globalThis.eventsTestDeleteResult = true;
    await act(async () => button(translate('common.delete'), document.querySelector('[role="alertdialog"]')).click());
    await flush();
    assert.equal(globalThis.eventsTestDeleteCalls, 2);
    assert.equal(document.querySelector('[data-location]').textContent, '/events');
    assert.equal(document.querySelector('[role="alertdialog"]'), null);
  } finally { await view.cleanup(); }
});
