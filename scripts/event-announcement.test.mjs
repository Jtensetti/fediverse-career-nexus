import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const sv = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url), 'utf8'));
globalThis.eventTest = {
  translate: key => key.split('.').reduce((value, part) => value?.[part], sv) || key,
  posts: [], toasts: [], inserts: [],
};
globalThis.window = { location: new URL('https://example.test/events/create') };
const mocks = {
  '@/i18n': 'export default {language:"sv",resolvedLanguage:"sv",t:globalThis.eventTest.translate};',
  '@/lib/supabase': `export const supabase={
    auth:{getSession:async()=>({data:{session:{user:{id:"test-owner"}}}})},
    from:table=>({insert:data=>{globalThis.eventTest.inserts.push({table,data});return {select:()=>({single:async()=>({data:globalThis.eventTest.savedEvent,error:null})})};}})
  };`,
  'sonner': 'export const toast={success:message=>globalThis.eventTest.toasts.push(message),error:message=>globalThis.eventTest.toasts.push(message)};',
  '../posts/postService': 'export const createPost=async data=>{globalThis.eventTest.posts.push(data);if(globalThis.eventTest.postFails)throw new Error("Simulated announcement failure");return {id:"announcement"};};',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'event-test:' + specifier, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('event-test:')) return { format: 'module', source: mocks[url.slice(11)], shortCircuit: true };
    return next(url, context);
  },
});
const { createEvent } = await import('../src/services/misc/eventService.ts');
const sample = {
  id: 'event-1', user_id: 'test-owner', title: 'Designmöte', description: 'Private description',
  location: 'Stockholm', start_date: '2026-09-25T10:00:00Z', end_date: '2026-09-25T11:00:00Z',
  is_online: false, meeting_url: null, cover_image_url: null, max_attendees: null,
};
function setup(visibility) {
  Object.assign(globalThis.eventTest, { savedEvent: { ...sample, visibility }, posts: [], toasts: [], inserts: [], postFails: false });
}

test('private, connections-only and unspecified saved events never create a public feed announcement', async () => {
  for (const visibility of ['private', 'connections', undefined, null]) {
    setup(visibility);
    // The persisted audience is authoritative even if an input claims public.
    const event = await createEvent({ ...sample, visibility: 'public' });
    assert.equal(event.visibility, visibility);
    assert.equal(globalThis.eventTest.inserts.length, 1);
    assert.equal(globalThis.eventTest.inserts[0].table, 'events');
    assert.deepEqual(globalThis.eventTest.posts, [], String(visibility));
    assert.deepEqual(globalThis.eventTest.toasts, [sv.toasts.eventCreated]);
  }
});

test('public event announcement uses Swedish text and escapes user supplied title and location', async () => {
  setup('public');
  Object.assign(globalThis.eventTest.savedEvent, { title: 'Test <img src=x onerror=alert(1)> & "text"', location: '<script>bad()</script>', is_online: true });
  await createEvent({ ...sample, visibility: 'public' });
  assert.equal(globalThis.eventTest.posts.length, 1);
  const content = globalThis.eventTest.posts[0].content;
  const doc = new JSDOM(content).window.document;
  assert.equal(doc.querySelector('strong').textContent, globalThis.eventTest.savedEvent.title);
  assert.equal(doc.querySelector('script,img'), null);
  assert.equal(doc.querySelector('a').href, 'https://example.test/events/event-1');
  assert.ok(doc.body.textContent.includes(sv.eventAnnouncement.created));
  assert.ok(doc.body.textContent.includes(sv.eventAnnouncement.online));
  assert.ok(doc.body.textContent.includes(sv.eventAnnouncement.details));
  assert.match(doc.body.textContent, /fredag|september/);
  assert.doesNotMatch(doc.body.textContent, /New event|Online event|Read more|eventAnnouncement\./);
  assert.ok(!doc.body.textContent.includes(sample.description));
});

test('a failed optional public announcement does not turn a saved event into a failed creation', async () => {
  setup('public'); globalThis.eventTest.postFails = true;
  const originalWarn = console.warn; console.warn = () => {};
  try {
    const event = await createEvent({ ...sample, visibility: 'public' });
    assert.equal(event.id, sample.id);
    assert.deepEqual(globalThis.eventTest.toasts, [sv.toasts.eventCreated]);
  } finally { console.warn = originalWarn; }
});
