import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/feed', pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter',
  'HTMLTextAreaElement', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver']) globalThis[name] = dom.window[name];
globalThis.IntersectionObserver = class {
  constructor(callback) { this.callback = callback; }
  observe() { this.callback([{ isIntersecting: true }]); }
  disconnect() {}
};
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const translate = key => key.split('.').reduce((value, part) => value?.[part], translations) ?? key;
const mocks = {
  '@/contexts/AuthContext': 'export const useAuth=()=>({user:{id:"owner"}});',
  '@/services/posts/postService': 'export const deletePost=async id=>{globalThis.postCardTest.deleted.push(id);};',
  '@/services/posts/postReplyService': `
    export const getPostReplies=async()=>globalThis.postCardTest.replies.map(reply=>({...reply}));
    export const createPostReply=async(...args)=>{
      globalThis.postCardTest.replyCalls.push(args);
      globalThis.postCardTest.replies.push({id:'new-reply', content:args[1], parent_reply_id:args[2],
        user_id:'owner', author:{username:'owner'}, created_at:'2026-09-23T01:00:00Z'});
      return true;
    };
  `,
  '@/services/content/reactionsService': 'export const getBatchReplyReactions=async()=>({});',
  '@/services/content/savedItemsService': 'export const toggleSaveItem=async()=>({success:true,saved:true});',
  '@/hooks/useContentCheck': 'export const useContentCheck=()=>({check:async()=>true,checking:false,dialog:null});',
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.postCardTest.translate});',
  '@/i18n': 'export default {language:"sv",resolvedLanguage:"sv",t:(k,v)=>globalThis.postCardTest.translate(k,v),on(){}}; export const changeLanguage=async()=>{};',
  'sonner': 'export const toast={error:message=>{throw new Error(message);}};',
  '@/components/content/LinkPreview': 'export const extractUrls=()=>[];',
  '@/components/common/ProfileHoverCard': 'export const ProfileHoverCard=({children})=>children;',
  '@/components/common/AvatarWithStatus': 'export default function Avatar(){return null;}',
  '@/components/posts/QuotedPostPreview': 'export const RepostIndicator=()=>null;',
  '@/components/common/ShareButton': 'export const ShareButton=globalThis.postCardTest.ShareButton;',
  '@/components/common/ReportDialog': 'export const ReportDialog=()=>null;',
  '@/components/moderation/BlockUserDialog': 'export default function BlockUserDialog(){return null;}',
  '@/components/posts/QuoteRepostDialog': 'export default function QuoteRepostDialog(){return null;}',
};
const fileMocks = {
  '/src/components/reactions/EnhancedCommentReactions.tsx': 'export const EnhancedCommentReactions=()=>null;',
  '/src/components/federation/post-card/PostCardContent.tsx': 'export default globalThis.postCardTest.Content;',
  '/src/components/federation/post-card/PostCardActions.tsx': 'export default function Actions(){return null;}',
  '/src/components/federation/post-card/postCardUtils.ts': `
    export const getRawContent=()=>"Post body";
    export const getActorName=()=>"Test person";
    export const getActorUsername=()=>"test_person";
    export const getAvatarUrl=()=>null;
    export const getMediaAttachments=()=>[];
    export const getProfileLink=()=>"/profile/test_person";
    export const getInstanceSuffix=()=>"@nolto.social";
  `,
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'post-card-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
      }
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const stem = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('post-card-mock:')) return { format: 'module', source: mocks[url.slice(15)], shortCircuit: true };
    for (const [path, source] of Object.entries(fileMocks)) {
      if (url.endsWith(path)) return { format: 'module', source, shortCircuit: true };
    }
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(
      readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
      }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { createPortal } = await import('react-dom');
const { MemoryRouter, useLocation } = await import('react-router-dom');
const h = React.createElement;
globalThis.postCardTest = {
  translate, deleted: [],
  ShareButton: React.forwardRef(({ url, title, variant, size, ...props }, ref) => h('button', { ...props, ref }, 'Share')),
  // Only unrelated body/reaction data is stubbed. The actual card, header,
  // Radix dropdown portal and deletion AlertDialog are mounted below.
  Content: () => h(React.Fragment, null,
    h('p', { 'data-testid': 'post-body' }, 'Post body'),
    h('input', { 'aria-label': 'Inline input' }),
    h('label', null, 'Inline label', h('input', { type: 'checkbox' })),
    h('div', { contentEditable: true, suppressContentEditableWarning: true }, 'Editable text'),
    h('span', { onClick: event => event.preventDefault(), 'data-testid': 'prevented' }, 'Child owns click'),
    createPortal(h('div', { role: 'dialog', 'aria-label': 'Nested portal' },
      h('p', { 'data-testid': 'portal-text' }, 'Modal text')), document.body)),
};
const { default: PostCard } = await import('../src/components/federation/post-card/index.tsx');
const post = { id: 'post-1', source: 'local', user_id: 'owner', type: 'Note',
  content: { content: 'Post body', published: '2026-09-23T00:00:00Z' } };

function Location() { return h('output', { 'data-testid': 'location' }, useLocation().pathname); }
function location() { return document.querySelector('[data-testid="location"]').textContent; }
function menuItem(key) { return [...document.querySelectorAll('[role="menuitem"]')].find(node => node.textContent.trim() === translate(key)); }
function button(key) { return [...document.querySelectorAll('button')].find(node => node.textContent.trim() === translate(key)); }
async function mount(showComments = false) {
  globalThis.postCardTest.deleted = [];
  const edited = [], removed = [];
  const root = createRoot(document.getElementById('root'));
  await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/feed'] },
    h(Location), h(PostCard, { post, hideComments: !showComments, onEdit: value => edited.push(value.id), onDelete: id => removed.push(id) }))));
  return { edited, removed, unmount: () => React.act(async () => root.unmount()) };
}
async function openMenu(keyboard = false) {
  const trigger = document.querySelector('button[aria-haspopup="menu"]');
  await React.act(async () => {
    trigger.focus();
    trigger.dispatchEvent(keyboard
      ? new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      : new MouseEvent('pointerdown', { button: 0, bubbles: true, cancelable: true }));
  });
  assert.ok(document.querySelector('[role="menu"]'), 'Actual portaled dropdown must be open');
}

test('delete opens confirmation from the feed once and confirms without navigating to the post', async () => {
  const view = await mount();
  try {
    await openMenu();
    const item = menuItem('postCard.deletePost');
    assert.equal(document.querySelector('[role="article"]').contains(item), false, 'Menu must be a real portal');
    await React.act(async () => item.click());
    assert.equal(location(), '/feed', 'Choosing Delete must not activate the card');
    assert.ok(document.querySelector('[role="alertdialog"]'));
    assert.deepEqual(globalThis.postCardTest.deleted, [], 'Opening confirmation must not delete');
    await React.act(async () => button('postCard.delete').click());
    assert.deepEqual(globalThis.postCardTest.deleted, ['post-1']);
    assert.deepEqual(view.removed, ['post-1']);
    assert.equal(location(), '/feed');
  } finally { await view.unmount(); }
});

test('keyboard menu editing and cancelling deletion keep the feed route', async () => {
  const view = await mount();
  try {
    await openMenu(true);
    const edit = menuItem('postCard.edit');
    await React.act(async () => {
      edit.focus();
      edit.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    });
    assert.deepEqual(view.edited, ['post-1']);
    assert.equal(location(), '/feed');
    await openMenu(true);
    await React.act(async () => menuItem('postCard.deletePost').click());
    await React.act(async () => button('postCard.cancel').click());
    assert.equal(document.querySelector('[role="alertdialog"]'), null);
    assert.deepEqual(globalThis.postCardTest.deleted, []);
    assert.equal(location(), '/feed');
  } finally { await view.unmount(); }
});

test('nested portal text and inline form controls do not activate card navigation', async () => {
  const view = await mount();
  try {
    for (const selector of ['[data-testid="portal-text"]', 'input', 'label', '[contenteditable="true"]', '[data-testid="prevented"]']) {
      await React.act(async () => document.querySelector(selector).click());
      assert.equal(location(), '/feed', selector);
    }
  } finally { await view.unmount(); }
});

test('plain post content and a directly focused card retain navigation by mouse and keyboard', async () => {
  for (const action of ['click', 'Enter', ' ']) {
    const view = await mount();
    try {
      await React.act(async () => {
        if (action === 'click') document.querySelector('[data-testid="post-body"]').click();
        else {
          const card = document.querySelector('[role="article"]');
          card.focus();
          card.dispatchEvent(new KeyboardEvent('keydown', { key: action, bubbles: true, cancelable: true }));
        }
      });
      assert.equal(location(), '/post/post-1', action);
    } finally { await view.unmount(); }
  }
});

test('replying to a feed comment saves the parent id and displays the child without navigating or scrolling', async () => {
  await import('../src/components/posts/CommentPreview.tsx');
  globalThis.postCardTest.replies = [{ id: 'comment-1', content: 'Parent comment', user_id: 'other',
    author: { username: 'tensetti', fullname: 'Tensetti' }, created_at: '2026-09-23T00:00:00Z' }];
  globalThis.postCardTest.replyCalls = [];
  let scrolls = 0;
  HTMLElement.prototype.scrollIntoView = () => { scrolls++; };
  const view = await mount(true);
  try {
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    const replyButton = [...document.querySelectorAll('button')].find(node => node.getAttribute('aria-label') === `${translate('comments.replyTo')} Tensetti`);
    assert.ok(replyButton, 'Each feed comment offers Reply');
    await React.act(async () => replyButton.click());
    const input = document.querySelector('textarea');
    assert.equal(input.getAttribute('aria-label'), `${translate('comments.replyTo')} Tensetti`);
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'My inline child reply');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter', ctrlKey: true, bubbles: true, cancelable: true,
    })));
    assert.deepEqual(globalThis.postCardTest.replyCalls, [['post-1', 'My inline child reply', 'comment-1', undefined]]);
    assert.ok(document.querySelector('[role="article"]').textContent.includes('My inline child reply'), 'New nested reply is visible in the feed');
    assert.ok(document.querySelector('[role="status"]'));
    assert.equal(location(), '/feed');
    assert.equal(scrolls, 0);
  } finally { await view.unmount(); }
});

test('feed previews stay compact when a visible comment has many replies', async () => {
  const author = { username: 'tensetti', fullname: 'Tensetti' };
  globalThis.postCardTest.replies = [
    { id: 'root-1', content: 'First root', user_id: 'other', author, created_at: '2026-09-23T00:00:00Z' },
    { id: 'root-2', content: 'Second root', user_id: 'other', author, created_at: '2026-09-23T00:00:00Z' },
    ...Array.from({ length: 20 }, (_, index) => ({ id: `child-${index}`, content: `Nested reply ${index}`,
      parent_reply_id: 'root-1', user_id: 'other', author, created_at: `2026-09-23T00:${String(index).padStart(2, '0')}:00Z` })),
  ];
  const view = await mount(true);
  try {
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
    const replyActions = [...document.querySelectorAll('button')].filter(node => node.getAttribute('aria-label')?.startsWith(translate('comments.replyTo')));
    assert.ok(replyActions.length <= 4, 'A feed preview must not render the entire discussion tree');
    assert.ok(document.querySelector('[role="article"]').textContent.includes('Nested reply 19'), 'Show the latest reply in the preview');
    assert.ok([...document.querySelectorAll('a[href="/post/post-1"]')].some(node => node.textContent.includes(translate('commentPreview.viewAllComments'))));
  } finally { await view.unmount(); }
});
