import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('global accessibility fixes use structural and user-preference signals', () => {
  const css = read('src/index.css');
  const nav = read('src/components/layout/MobileBottomNav.tsx');
  assert.match(css, /body:has\(\[data-mobile-bottom-nav\]\)/);
  assert.doesNotMatch(css, /aria-label=["']Mobilnavigering/);
  assert.doesNotMatch(css, /\[role=["']status["']\]\[aria-live=["']polite["']\][^{]*\{[^}]*sr-only/s);
  assert.doesNotMatch(css, /\*[^]*forced-color-adjust:\s*none/);
  assert.match(nav, /data-mobile-bottom-nav/);
});

test('shared standalone controls meet the minimum target and wrap translations', () => {
  const button = read('src/components/ui/button.tsx');
  const select = read('src/components/ui/select.tsx');
  const tabs = read('src/components/ui/tabs.tsx');
  assert.match(button, /whitespace-normal break-words/);
  assert.match(button, /icon: "h-11 w-11/);
  assert.match(select, /min-h-11/);
  assert.match(tabs, /whitespace-normal break-words/);
});

test('high-value list state is represented in deep-linkable URLs', () => {
  for (const file of ['src/pages/jobs/Jobs.tsx', 'src/pages/articles/Articles.tsx', 'src/pages/events/Events.tsx', 'src/pages/company/Companies.tsx']) {
    const source = read(file);
    assert.match(source, /useSearchParams/);
    assert.match(source, /isError/);
    assert.match(source, /refetch/);
  }
});

test('create and edit flows guard dirty work without storing form contents', () => {
  const hook = read('src/hooks/useUnsavedChanges.ts');
  assert.match(hook, /beforeunload/);
  assert.match(hook, /window\.confirm/);
  assert.doesNotMatch(hook, /localStorage|sessionStorage/);
  for (const file of [
    'src/pages/jobs/JobCreate.tsx', 'src/pages/jobs/JobEdit.tsx',
    'src/pages/events/EventCreate.tsx', 'src/pages/events/EventEdit.tsx',
    'src/pages/company/CompanyCreate.tsx', 'src/pages/company/CompanyEdit.tsx',
  ]) assert.match(read(file), /useUnsavedChanges/);
});

test('messages distinguish query errors and preserve scroll when older messages prepend', () => {
  const list = read('src/pages/messaging/Messages.tsx');
  const thread = read('src/pages/messaging/MessageConversation.tsx');
  assert.match(list, /requestsError/);
  assert.match(list, /connectionsError/);
  assert.match(thread, /previousHeight/);
  assert.match(thread, /scrollTop = previousTop \+ container\.scrollHeight - previousHeight/);
});