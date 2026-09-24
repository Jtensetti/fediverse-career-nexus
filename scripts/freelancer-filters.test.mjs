import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/freelancers', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const copy = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
globalThis.freelancerCopy = key => key.split('.').reduce((value, part) => value?.[part], copy) ?? key;
const mocks = {
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.freelancerCopy});',
  '@/i18n': 'export default {language:"sv",resolvedLanguage:"sv",t:(k,v)=>globalThis.freelancerCopy(k,v),on(){}}; export const changeLanguage=async()=>{};',
  '@tanstack/react-query': 'export const useQuery=({queryKey})=>({data:queryKey[0]==="freelancer-locations"?["", "Stockholm"]:[],isLoading:false});',
  '@/components/layout/DashboardLayout': 'export default ({children})=>children;',
  '@/components/common/SEOHead': 'export const SEOHead=()=>null;',
  '@/components/common/AvatarWithStatus': 'export default ()=>null;',
  '@/services/misc/freelancerService': 'export const searchFreelancers=async()=>[];export const getFreelancerLocations=async()=>[];',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'freelancer-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const stem = specifier.startsWith('@/') ? new URL('../src/' + specifier.slice(2), import.meta.url) : new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('freelancer-mock:')) return { format: 'module', source: mocks[url.slice('freelancer-mock:'.length)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { default: Freelancers } = await import('../src/pages/social/Freelancers.tsx');

test('opening freelancer filters keeps the page usable and exposes named unfiltered choices', async () => {
  const root = createRoot(document.getElementById('root'));
  try {
    await React.act(async () => root.render(React.createElement(Freelancers)));
    const toggle = document.querySelector('button[aria-controls="freelancer-filters"]');
    await React.act(async () => toggle.click());
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    const filters = [...document.querySelectorAll('[role="combobox"]')];
    assert.deepEqual(filters.map(filter => filter.getAttribute('aria-label')), ['Plats', 'Tillgänglighet']);
    assert.deepEqual(filters.map(filter => filter.textContent), ['Alla platser', 'All tillgänglighet']);
    assert.ok(document.querySelector('h1').textContent.includes('Hitta frilansare'));
    await React.act(async () => toggle.click());
    assert.equal(document.querySelectorAll('[role="combobox"]').length, 0);
  } finally { await React.act(async () => root.unmount()); }
});
