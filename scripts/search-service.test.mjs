import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === '@/lib/supabase') return { url: 'search-test:client', shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const url = new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url);
      if (existsSync(fileURLToPath(url))) return { url: url.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'search-test:client') return { format: 'module', source: 'export const supabase=globalThis.searchTestClient;', shortCircuit: true };
    return next(url, context);
  },
});

let requests = [], responses = {};
globalThis.searchTestClient = createClient('https://search.example.test', 'synthetic-public-key', {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: async input => {
    const url = new URL(input); requests.push(url);
    const table = url.pathname.split('/').at(-1);
    const response = responses[table] || { data: [] };
    return new Response(JSON.stringify(response.data), {
      status: response.status || 200, headers: { 'content-type': 'application/json' },
    });
  } },
});
const { searchService } = await import('../src/services/search/searchService.ts');
const { advancedSearchService } = await import('../src/services/search/advancedSearchService.ts');
const { searchTerms } = await import('../src/lib/searchQuery.ts');
const reset = () => { requests = []; responses = {}; };
const request = table => requests.find(url => url.pathname.endsWith('/' + table));

test('full names match separate username words and every profile word is required', async () => {
  reset();
  await searchService.search(' Jonatan  Tensetti ');
  const filter = request('public_profiles').searchParams.get('or');
  assert.equal(filter, '(and(or(username.ilike."%Jonatan%",fullname.ilike."%Jonatan%",headline.ilike."%Jonatan%"),or(username.ilike."%Tensetti%",fullname.ilike."%Tensetti%",headline.ilike."%Tensetti%")))');
  assert.equal(request('public_profiles').searchParams.get('limit'), '5');
});

test('Unicode names and hostile punctuation remain search text and plain full-text queries', async () => {
  reset();
  const query = 'Åsa_O’Neil, (100%) "x:y" \\ C++';
  assert.deepEqual(searchTerms(query), ['Åsa', 'O', 'Neil', '100', 'x', 'y', 'C']);
  await searchService.search(query);
  const filter = request('public_profiles').searchParams.get('or');
  assert.match(filter, /username\.ilike\."%Åsa%"/);
  assert.doesNotMatch(filter, /100%\)|O’Neil|C\+\+|\\/);
  for (const table of ['job_posts', 'articles', 'events']) {
    assert.equal(request(table).searchParams.get('search_vector'), 'plfts(english).' + query);
  }
  reset();
  assert.equal((await searchService.search(' , () %_* ')).total, 0);
  assert.equal(requests.length, 0, 'Punctuation-only input must not return every profile');
});

test('a failed source is distinguishable from an empty result and preserves successful sources', async () => {
  reset();
  responses.public_profiles = { data: [{ id: 'profile-1', username: 'jonatan_tensetti', fullname: 'Tensetti' }] };
  responses.articles = { status: 400, data: { message: 'Private provider diagnostic' } };
  const result = await searchService.search('Jonatan Tensetti');
  assert.equal(result.profiles[0].url, '/profile/jonatan_tensetti');
  assert.equal(result.total, 1);
  assert.deepEqual(result.failedSources, ['articles']);
  assert.doesNotMatch(JSON.stringify(result), /Private provider diagnostic/);
});

test('advanced search combines profile terms, location, server, employer and education', async () => {
  reset();
  responses.experiences = { data: [{ user_id: 'matching-user' }, { user_id: 'other-user' }] };
  responses.education = { data: [{ user_id: 'matching-user' }] };
  responses.public_profiles = { data: [{ id: 'matching-user', username: 'asa_neil' }] };
  const result = await advancedSearchService.searchPeople({ query: 'Åsa Neil', location: 'Lund', homeInstance: 'local', company: 'Acme', institution: 'School' });
  const url = request('public_profiles');
  assert.match(url.searchParams.get('or'), /%Åsa%/);
  assert.match(url.searchParams.get('or'), /%Neil%/);
  assert.equal(url.searchParams.get('location'), 'ilike.%Lund%');
  assert.equal(url.searchParams.get('home_instance'), 'is.null');
  assert.deepEqual(url.searchParams.getAll('id'), ['in.(matching-user,other-user)', 'in.(matching-user)']);
  assert.equal(result[0].id, 'matching-user');
});

test('profile and CV query failures propagate instead of looking like no matches', async () => {
  reset();
  responses.public_profiles = { status: 400, data: { message: 'Private provider diagnostic' } };
  await assert.rejects(() => advancedSearchService.searchPeople({ query: 'person' }), /Profile search failed/);
  await assert.rejects(() => searchService.searchProfiles('person'), /Profile search failed/);
  reset();
  responses.experiences = { status: 400, data: { message: 'Private provider diagnostic' } };
  await assert.rejects(() => advancedSearchService.searchPeople({ company: 'Acme' }), /Company search failed/);
});

test('all instances removes the server constraint rather than searching a server named all', async () => {
  reset();
  await advancedSearchService.searchPeople({ query: 'person', homeInstance: 'all' });
  assert.equal(request('public_profiles').searchParams.has('home_instance'), false);
});
