import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/feed', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Element', 'Node',
  'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
globalThis.localStorage = dom.window.localStorage;
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const translate = (key, opts = {}) => {
  const value = key.split('.').reduce((item, part) => item?.[part], translations) ?? key;
  return value.replace(/{{(\w+)}}/g, (_, field) => opts[field] ?? '');
};
const mocks = {
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.feedTest.translate});',
  '@/i18n': 'export default {language:"sv",resolvedLanguage:"sv",t:(k,v)=>globalThis.feedTest.translate(k,v),on(){}}; export const changeLanguage=async()=>{};',
  '@/contexts/AuthContext': 'export const useAuth=()=>({user:globalThis.feedTest.user,loading:false});',
  '@/lib/supabase': 'export const supabase=globalThis.feedTest.supabase;',
  '@/hooks/useContentCheck': 'export const useContentCheck=()=>({check:async()=>true,checking:false,dialog:null});',
  '@/hooks/usePostImageDraft': 'export const usePostImageDraft=()=>({clear(){},preview:null});',
  '@/services/posts/postService': 'export const createPost=async()=>true;',
  '@/services/profile/profileService': 'export const getCurrentUserProfile=async()=>({});',
  '@/services/posts/pollService': 'export const createPollObject=()=>({});',
  '@/lib/imageCompression': 'export const formatFileSize=()=>"";',
  '@/components/content/LinkPreview': 'export const extractUrls=()=>[]; export const LinkPreview=()=>null;',
  '@/components/content/ContentWarningInput': 'export default ()=>null;',
  '@/components/content/PollCreator': 'export const PollCreator=()=>null;',
  '@/components/posts/ImageUploadStatus': 'export const ImageUploadStatus=()=>null;',
  '@/components/common/ProfileHoverCard': 'export const ProfileHoverCard=({children})=>children;',
  '@/components/common/SEOHead': 'export const SEOHead=()=>null;',
  '@/components/layout/Navbar': 'export default globalThis.feedTest.SearchNavbar;',
  '@/components/layout/Footer': 'export default ()=>null;',
  '@/components/social/FeedSelector': 'export default ()=>null;',
  '@/components/onboarding/OnboardingFlow': 'export default ()=>null;',
  '@/components/onboarding/ProfileCompleteness': 'export default ()=>null;',
  '@/components/social/ReferralWidget': 'export default ()=>null;',
  '@/hooks/useOnboarding': 'export const useOnboarding=()=>({showOnboarding:false,hasChecked:true,completeOnboarding(){}});',
  '@/components/posts/PostEditDialog': 'export default ()=>null;',
  '@/services/federation/federationService': 'export const getFederatedFeed=async()=>[];',
  '@/services/misc/batchDataService': 'export const getBatchPostData=async()=>new Map();',
  '@/services/misc/feedPreferencesService': 'export const getFeedPreferences=async()=>({});',
  '@/components/common/skeletons': 'export const PostSkeleton=()=>null;',
  '@/services/search/searchService': 'export const searchService={search:async()=>globalThis.feedTest.results};',
  '@/services/search/advancedSearchService': 'export const advancedSearchService={getFilterOptions:async()=>({locations:[],instances:[]}),searchPeople:async filters=>{globalThis.feedTest.searches.push(filters.query);return []}};',
  '@/services/misc/notificationService': 'export const notificationService={getNotifications:async()=>[],getUnreadCount:async()=>3,subscribeToNotifications:()=>()=>{}};',
  '@tanstack/react-query': `export const useQuery=({queryKey})=>({data:queryKey[0]==='currentUserProfile'?{displayName:'Test User'}:undefined});
    export const useInfiniteQuery=()=>({data:{pages:[[]]},isPending:false,isFetching:false,hasNextPage:false});
    export const useQueryClient=()=>({invalidateQueries(){}}); export const useMutation=()=>({isPending:false});`,
  'framer-motion': 'export const motion=globalThis.feedTest.motion; export const AnimatePresence=({children})=>children;',
  'sonner': 'export const toast={error:message=>{throw new Error(message);}};',
};
const fileMocks = {
  '/src/components/posts/PostEditDialog.tsx': 'export default ()=>null;',
  '/src/components/federation/FederatedPostCard.tsx': 'export default ()=>null;',
  '/src/components/common/PullToRefresh.tsx': 'export default ({children})=>children;',
  '/src/pages/federation/Explore.tsx': 'export default ()=>null;',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'feed-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const stem = specifier.startsWith('@/') ? new URL('../src/' + specifier.slice(2), import.meta.url) : new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('feed-mock:')) return { format: 'module', source: mocks[url.slice(10)], shortCircuit: true };
    for (const [path, source] of Object.entries(fileMocks)) if (url.endsWith(path)) return { format: 'module', source, shortCircuit: true };
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
const state = globalThis.feedTest = {
  translate, user: { id: 'owner' }, searches: [], postExists: false, queries: [],
  results: { profiles: [], jobs: [], articles: [], events: [], total: 0 },
  motion: Object.fromEntries(['button', 'div'].map(tag => [tag, React.forwardRef(({ whileHover, whileTap, initial, animate, exit, layoutId, transition, ...props }, ref) => h(tag, { ...props, ref }))])),
  SearchNavbar: () => h(GlobalSearch),
  supabase: { from(table) {
    const filters = [];
    const chain = { select() { return chain; }, eq(...args) { filters.push(args); return chain; }, or() { return chain; },
      in(...args) { filters.push(args); return chain; }, maybeSingle: async () => ({ data: { id: 'actor-1' } }),
      limit: async () => { state.queries.push({ table, filters }); return { data: table === 'ap_objects' && state.postExists ? [{ id: 'post-1' }] : [] }; } };
    return chain;
  } },
};
const { GlobalSearch } = await import('../src/components/layout/GlobalSearch.tsx');
const { default: SearchPage } = await import('../src/pages/search/Search.tsx');
const { default: PostComposer } = await import('../src/components/posts/PostComposer.tsx');
const { default: SuggestedActions } = await import('../src/components/onboarding/SuggestedActions.tsx');
const { default: Feed } = await import('../src/components/federation/FederatedFeed.tsx');
const { NotificationBell } = await import('../src/components/layout/NotificationBell.tsx');
const { default: FeedPage } = await import('../src/pages/federation/FederatedFeed.tsx');
const { default: MobileBottomNav } = await import('../src/components/layout/MobileBottomNav.tsx');
function Location() { const value = useLocation(); return h('output', { 'data-testid': 'location' }, value.pathname + value.search); }
function location() { return document.querySelector('[data-testid="location"]').textContent; }
function labelled(label) { return [...document.querySelectorAll('[aria-label]')].find(node => node.getAttribute('aria-label') === translate(label)); }
async function mount(component, path = '/feed') {
  const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(h(MemoryRouter, { initialEntries: [path] }, h(Location), component)));
  return () => React.act(async () => root.unmount());
}
async function type(value) {
  const input = document.querySelector('input[type="search"]');
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}
async function key(input, value, options = {}) {
  await React.act(async () => input.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options })));
}

test('Enter submits an unselected query, while IME composition does not submit', async () => {
  let closed = 0;
  const unmount = await mount(h(GlobalSearch, { onResultClick: () => closed++ }));
  try {
    assert.ok(labelled('search.searchLabel'));
    const input = await type(' Tensetti ');
    await key(input, 'Enter', { isComposing: true });
    assert.equal(location(), '/feed');
    await key(input, 'Enter');
    assert.equal(location(), '/search?q=Tensetti');
    assert.equal(closed, 1);
  } finally { await unmount(); }
});

test('ArrowDown then Enter retains direct result navigation and closes mobile search', async () => {
  state.results = { profiles: [{ id: 'tensetti', title: 'Tensetti', type: 'profile', url: '/profile/tensetti' }], jobs: [], articles: [], events: [], total: 1 };
  let closed = 0;
  const unmount = await mount(h(GlobalSearch, { onResultClick: () => closed++ }));
  try {
    const input = await type('Tensetti');
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 320)); });
    await key(input, 'ArrowDown'); await key(input, 'Enter');
    assert.equal(location(), '/profile/tensetti');
    assert.equal(closed, 1);
  } finally { await unmount(); }
});

test('search results resynchronize when navbar changes the query on the search page', async () => {
  state.searches = [];
  const unmount = await mount(h(SearchPage), '/search?q=First');
  try {
    assert.deepEqual(state.searches, ['First']);
    const input = await type('Second'); await key(input, 'Enter');
    assert.deepEqual(state.searches, ['First', 'Second']);
    assert.equal(location(), '/search?q=Second');
  } finally { await unmount(); }
});

test('first-post suggestion opens the actual composer with named controls and public audience', async () => {
  function Harness() {
    const [open, setOpen] = React.useState(false);
    return h(React.Fragment, null, h(PostComposer, { open, onOpenChange: setOpen }), h(SuggestedActions, { onCreatePost: () => setOpen(true) }));
  }
  state.postExists = false; localStorage.clear();
  const unmount = await mount(h(Harness));
  try {
    assert.equal(labelled('posts.whatsOnMind').tagName, 'BUTTON');
    await React.act(async () => labelled('suggestions.shareFirstPost').click());
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.ok(labelled('posts.contentLabel'));
    assert.ok(labelled('posts.addImage'));
    assert.ok(labelled('posts.addPoll'));
    assert.ok(document.querySelector('[role="dialog"]').textContent.includes(translate('posts.publicAudienceDescription')));
    assert.equal(location(), '/feed');
  } finally { await unmount(); }
});

test('completed first-post suggestion uses the actor identity and Create storage type', async () => {
  state.postExists = true; state.queries = []; localStorage.clear();
  const unmount = await mount(h(SuggestedActions, { onCreatePost() {} }));
  try {
    assert.equal(labelled('suggestions.shareFirstPost'), undefined);
    const query = state.queries.find(item => item.table === 'ap_objects');
    assert.deepEqual(query.filters, [['attributed_to', 'actor-1'], ['type', ['Create', 'Note', 'Question']]]);
    const dismiss = [...document.querySelectorAll('button')].find(node => node.getAttribute('aria-label')?.includes(translate('suggestions.writeArticle')));
    assert.ok(dismiss); assert.ok(!dismiss.className.includes('opacity-0'));
  } finally { await unmount(); }
});

test('empty following feed exposes Nolto exploration and people discovery', async () => {
  let explored = 0;
  const unmount = await mount(h(Feed, { onExploreNolto: () => explored++ }));
  try {
    const button = [...document.querySelectorAll('button')].find(node => node.textContent === translate('personalFeeds.exploreNolto'));
    await React.act(async () => button.click());
    assert.equal(explored, 1);
    assert.equal(document.querySelector('a[href="/search"]').textContent, translate('personalFeeds.findPeople'));
  } finally { await unmount(); }
});

test('notification trigger has a descriptive accessible name including unread count', async () => {
  const unmount = await mount(h(NotificationBell));
  try {
    assert.equal(document.querySelector('button').getAttribute('aria-label'), translate('notifications.openUnread', { count: 3 }));
  } finally { await unmount(); }
});

test('mobile create-post action opens the composer from another page and can reopen it from the feed', async () => {
  const unmount = await mount(h(React.Fragment, null, h(MobileBottomNav),
    h(Routes, null, h(Route, { path: '/jobs', element: h('p', null, 'Jobs page') }), h(Route, { path: '/feed', element: h(FeedPage) }))), '/jobs');
  try {
    await React.act(async () => document.querySelector('a[aria-label="Skapa nytt inlägg"]').click());
    assert.equal(location(), '/feed');
    assert.ok(document.querySelector('[role="dialog"]'));
    const textarea = labelled('posts.contentLabel');
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'My unfinished post');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const close = [...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent === translate('common.close'));
    assert.ok(close);
    await React.act(async () => close.click());
    assert.equal(document.querySelector('[role="dialog"]'), null);
    await React.act(async () => document.querySelector('a[aria-label="Skapa nytt inlägg"]').click());
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(labelled('posts.contentLabel').value, 'My unfinished post');
    assert.equal(location(), '/feed', 'The consumed compose request does not remain in the address');
  } finally { await unmount(); }
});
