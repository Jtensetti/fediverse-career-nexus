import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/jobs/test-job' });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'CustomEvent', 'MutationObserver', 'FileList']) globalThis[name] = dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const translate = (key, values = {}) => {
  const text = key.split('.').reduce((object, part) => object?.[part], translations) ?? key;
  return typeof text === 'string' ? text.replace(/{{(\w+)}}/g, (_, field) => values[field] ?? '') : key;
};
globalThis.jobsTestTranslate = translate;
globalThis.jobsTestUser = { id: 'owner' };
const mocks = {
  '@/contexts/AuthContext': 'export const useAuth=()=>({user:globalThis.jobsTestUser,loading:false});',
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.jobsTestTranslate,i18n:{language:"sv"}});',
  '@/i18n': 'export default {language:"sv",resolvedLanguage:"sv",t:(k,v)=>globalThis.jobsTestTranslate(k,v),on(){}}; export const changeLanguage=async()=>{};',
  '@/services/misc/jobPostsService': 'export const getJobPostById=async()=>globalThis.jobsTestJob;',
  '@/services/company/companyRolesService': 'export const getUserCompanies=async()=>[];',
  '@/services/company/companyService': 'export const getCompanyById=async()=>null;',
  '@/services/content/savedItemsService': 'export const isItemSaved=async()=>false; export const toggleSaveItem=async()=>({success:true,saved:true});',
  '@/components/layout/Navbar': 'export default function Navbar(){return null;}',
  '@/components/layout/Footer': 'export default function Footer(){return null;}',
  '@/components/common': `import React from 'react'; export const SEOHead=props=>React.createElement('div',{'data-noindex':String(!!props.noindex)}); export const ShareButton=()=>React.createElement('button',{},'Share'); export const ReportDialog=()=>React.createElement('button',{},'Report');`,
  '@/components/jobs/JobInquiryButton': `import React from 'react'; export const JobInquiryButton=({posterId})=>globalThis.jobsTestUser?.id===posterId?null:React.createElement('button',{},'Contact recruiter');`,
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'jobs-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const stem = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context.parentURL?.startsWith('jobs-mock:') ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith('jobs-mock:')) return { format: 'module', source: mocks[url.slice(10)], shortCircuit: true };
    if (/\.tsx$/.test(url)) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter, Routes, Route } = await import('react-router-dom');
const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
const { TooltipProvider } = await import('../src/components/ui/tooltip.tsx');
const { default: JobView } = await import('../src/pages/jobs/JobView.tsx');
const { default: JobForm } = await import('../src/components/jobs/JobForm.tsx');
const { default: JobSearchFilter } = await import('../src/components/jobs/JobSearchFilter.tsx');
const h = React.createElement;
const act = React.act;
const fixture = {
  id: 'test-job', user_id: 'owner', title: 'Frontend developer', company: 'Test organization',
  employment_type: 'full-time', location: 'Stockholm', description: 'A useful description for the test role.',
  is_active: false, created_at: '2026-09-24T10:00:00Z', remote_policy: 'on-site',
  salary_min: null, salary_max: null, salary_currency: 'SEK', skills: [],
  visa_sponsorship: null, transparency_score: 15,
};

async function render(component) {
  const root = createRoot(document.getElementById('root'));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const wrap = element => h(QueryClientProvider, { client }, h(TooltipProvider, {}, h(MemoryRouter, { initialEntries: ['/jobs/test-job'] }, element)));
  await act(async () => root.render(wrap(component)));
  return {
    rerender: async element => act(async () => root.render(wrap(element))),
    cleanup: async () => { await act(async () => root.unmount()); client.clear(); },
  };
}
function detail() { return h(Routes, {}, h(Route, { path: '/jobs/:id', element: h(JobView) })); }
function submitButton() { return document.querySelector('button[type="submit"]'); }
async function setInput(name, value) {
  const input = document.querySelector(`[name="${name}"]`);
  await act(async () => {
    const prototype = input.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('draft details identify the owner-only state and offer editing without public actions', async () => {
  globalThis.jobsTestUser = { id: 'owner' };
  globalThis.jobsTestJob = { ...fixture };
  const view = await render(detail());
  try {
    assert.ok(document.querySelector('[role="status"]').textContent.includes(translate('jobView.draftDescription')));
    assert.equal(document.querySelector('a[href="/jobs/edit/test-job"]').textContent, translate('jobView.editJob'));
    assert.ok(document.body.textContent.includes(translate('jobView.created')));
    assert.ok(document.body.textContent.includes(translate('jobView.draftApplications')));
    assert.ok(!document.body.textContent.includes(translate('jobView.posted')));
    assert.ok(![...document.querySelectorAll('button')].some(button => ['Share', 'Report', 'Contact recruiter'].includes(button.textContent)));
    assert.equal(document.querySelector('[data-noindex]').dataset.noindex, 'true');
  } finally { await view.cleanup(); }
});

test('published listings keep contact and share actions and explain the application fallback', async () => {
  globalThis.jobsTestUser = { id: 'candidate' };
  globalThis.jobsTestJob = { ...fixture, is_active: true };
  const view = await render(detail());
  try {
    assert.equal(document.querySelector('a[href="/jobs/edit/test-job"]'), null);
    assert.ok(document.body.textContent.includes('Contact recruiter'));
    assert.ok(document.body.textContent.includes('Share'));
    assert.ok(document.body.textContent.includes(translate('jobView.applicationHelp')));
    assert.equal(document.querySelector('[data-noindex]').dataset.noindex, 'false');
  } finally { await view.cleanup(); }
});

test('an owner signing out cannot retain the previously loaded draft on screen', async () => {
  globalThis.jobsTestUser = { id: 'owner' };
  globalThis.jobsTestJob = { ...fixture };
  const view = await render(detail());
  try {
    assert.ok(document.body.textContent.includes(fixture.title));
    globalThis.jobsTestUser = null;
    await view.rerender(detail());
    assert.ok(!document.body.textContent.includes(fixture.title));
    assert.ok(document.body.textContent.includes(translate('jobView.notFound')));
  } finally { await view.cleanup(); }
});

test('job form displays its full-time default, follows publication choice and retains application contacts', async () => {
  globalThis.jobsTestUser = { id: 'owner' };
  let submitted;
  const view = await render(h(JobForm, {
    defaultValues: { ...fixture, application_url: 'https://example.invalid/apply', contact_email: 'hiring@example.invalid' },
    onSubmit: values => { submitted = values; }, isSubmitting: false,
  }));
  try {
    assert.ok(document.querySelector('[role="combobox"]').textContent.includes(translate('jobFormLabels.fullTime')));
    assert.equal(submitButton().textContent, translate('jobFormLabels.saveDraft'));
    await act(async () => document.querySelector('[role="switch"]').click());
    assert.equal(submitButton().textContent, translate('jobFormLabels.publishJob'));
    await act(async () => document.querySelector('[role="switch"]').click());
    await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(submitted.is_active, false);
    assert.equal(submitted.employment_type, 'full-time');
    assert.equal(submitted.application_url, 'https://example.invalid/apply');
    assert.equal(submitted.contact_email, 'hiring@example.invalid');
    submitted = undefined;
    await setInput('application_url', 'javascript:alert(1)');
    await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(submitted, undefined);
    assert.ok(document.body.textContent.includes(translate('jobFormLabels.applicationUrlValidation')));
  } finally { await view.cleanup(); }
});

test('job search submits from the keyboard and clearing parent filters resets the visible controls', async () => {
  let result;
  const onFilterChange = filters => { result = filters; };
  const view = await render(h(JobSearchFilter, { filters: { search: 'designer', job_type: 'full_time', location: 'Stockholm', remote_allowed: true }, onFilterChange }));
  try {
    await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.deepEqual(result, { search: 'designer', job_type: 'full_time', location: 'Stockholm', remote_allowed: true });
    await view.rerender(h(JobSearchFilter, { filters: {}, onFilterChange }));
    assert.ok([...document.querySelectorAll('input[type="text"]')].every(input => input.value === ''));
    assert.equal(document.querySelector('[role="switch"]').getAttribute('aria-checked'), 'false');
    assert.ok(document.querySelector('[role="combobox"]').textContent.includes(translate('jobs.allJobTypes')));
  } finally { await view.cleanup(); }
});
