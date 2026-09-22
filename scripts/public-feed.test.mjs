import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fetchPublicFeed } from '../packages/public-feed/index.ts';
import { postText } from '../apps/mobile/content.ts';
const backend = { url: 'https://example.supabase.co', publishableKey: 'public-test-key' };
const id = '11111111-1111-4111-8111-111111111111';
const actorId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
afterEach(() => mock.restoreAll());

test('anonymous feed uses bounded pages and public author projections without a user session', async () => {
  const requests = [];
  const signal = new AbortController().signal;
  mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    const resources = {
      federated_feed: [{ id, attributed_to: actorId, company_id: null, source: 'local', published_at: '2026-09-22T00:00:00Z', content: { type: 'Create', object: { type: 'Note', content: '<p>Public text</p>' } } }],
      public_actors: [{ id: actorId, user_id: userId, preferred_username: 'author' }],
      public_profiles: [{ id: userId, username: 'author', fullname: 'Public name' }],
    };
    return Response.json(resources[url.pathname.split('/').pop()]);
  });
  const [post] = await fetchPublicFeed(backend, { scope: 'local', offset: 24, limit: 12, signal });
  assert.equal(post.actor_name, 'Public name');
  assert.equal(post.content.content, '<p>Public text</p>');
  assert.equal(requests[0].url.searchParams.get('offset'), '24');
  assert.equal(requests[0].url.searchParams.get('source'), 'eq.local');
  assert.equal(requests[0].url.searchParams.get('order'), 'published_at.desc.nullslast,id.desc');
  assert.deepEqual(requests.map(({ url }) => url.pathname.split('/').pop()), ['federated_feed', 'public_actors', 'public_profiles']);
  for (const { options } of requests) {
    assert.deepEqual(options.headers, { apikey: 'public-test-key' });
    assert.equal(options.credentials, 'omit');
    assert.equal(options.signal, signal);
  }
});

test('HTTP errors and malformed content cannot be mistaken for an empty timeline', async () => {
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 403 }));
  await assert.rejects(fetchPublicFeed(backend), /403/);
  mock.restoreAll();
  mock.method(globalThis, 'fetch', async () => Response.json([{ id, content: null }]));
  await assert.rejects(fetchPublicFeed(backend), /Invalid public post/);
});

test('rejects unbounded pages before a network call and stops on empty pages', async () => {
  const request = mock.method(globalThis, 'fetch', async () => Response.json([]));
  await assert.rejects(fetchPublicFeed(backend, { limit: 10000 }), /Invalid feed page/);
  await assert.rejects(fetchPublicFeed(backend, { offset: -1 }), /Invalid feed page/);
  assert.equal(request.mock.callCount(), 0);
  assert.deepEqual(await fetchPublicFeed(backend), []);
  assert.equal(request.mock.callCount(), 1);
});

test('native posts display text without executing or embedding remote markup', () => {
  assert.equal(postText({ content: '<p>One &amp; two</p><p>Three</p>' }), 'One & two\n\nThree');
  assert.equal(postText({ content: { bad: true } }), '');
  assert.equal(postText({ content: '<img src=x onerror="alert(1)">Hello' }), 'Hello');
});
