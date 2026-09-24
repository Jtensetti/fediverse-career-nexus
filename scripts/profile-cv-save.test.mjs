import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/profile/edit', pretendToBeVisual: true });
for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'FileList', 'Element', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver']) globalThis[key] = dom.window[key];
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const translations = JSON.parse(readFileSync(new URL('../src/i18n/locales/sv.json', import.meta.url)));
const mocks = {
  'react-i18next': 'export const useTranslation=()=>({t:globalThis.cvTest.translate,i18n:{language:"sv"}});',
  '@tanstack/react-query': 'export const useQueryClient=()=>({invalidateQueries(){}});',
  '@/lib/supabase': 'export const supabase={auth:{getUser:async()=>({data:{user:{id:"owner"}}})}};',
  '@/components/common/SEOHead': 'export const SEOHead=()=>null;',
  '@/components/LinkedInImport': 'export const LinkedInImportButton=()=>null;',
  '@/components/forms/MonthYearPicker': 'export const MonthYearPicker=()=>null;',
  '@/services/profile/profileService': 'export const getCurrentUserProfile=async()=>({username:"owner",displayName:"Test User",headline:"Test headline"});',
  '@/services/profile/profileEditService': 'export const updateUserProfile=async()=>true;export const checkUsernameAvailability=async()=>true;',
  '@/services/profile/profileCVService': `
    export const getUserExperiences=async()=>globalThis.cvTest.experiences;
    export const getUserEducation=async()=>globalThis.cvTest.education;
    export const getUserSkills=async()=>[];
    export const createExperience=item=>globalThis.cvTest.save('experience',item);
    export const createEducation=item=>globalThis.cvTest.save('education',item);
    export const updateExperience=(id,item)=>globalThis.cvTest.save('experience',item);
    export const updateEducation=(id,item)=>globalThis.cvTest.save('education',item);
    export const deleteExperience=async()=>true; export const deleteEducation=async()=>true;
    export const createSkill=async()=>null; export const deleteSkill=async()=>false;`,
  'sonner': 'export const toast={error:message=>{throw new Error(message);}};',
};
for (const name of ['auth/BlueskySignIn','settings/MastodonConnection','messaging/DMPrivacySettings','settings/FreelancerSettings','content/ProfileImageUpload','settings/NetworkVisibilityToggle','social/VerificationBadge','settings/DeleteAccountSection','settings/DataExportSection','settings/AccountMigrationSection','settings/EmailNotificationPreferences','auth/MFASettings']) mocks['@/components/'+name] = 'export default ()=>null;';
mocks['../../components/layout/Navbar'] = mocks['../../components/layout/Footer'] = 'export default ()=>null;';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'cv-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/') || (specifier.startsWith('.') && context.parentURL?.startsWith('file:'))) {
      const stem = specifier.startsWith('@/') ? new URL('../src/' + specifier.slice(2), import.meta.url) : new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
        if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith('cv-mock:')) return { format: 'module', source: mocks[url.slice(8)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});
const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const h = React.createElement;
const state = globalThis.cvTest = {
  experiences: [], education: [], calls: [], resolve: null,
  translate(key, opts = {}) { return (key.split('.').reduce((value, part) => value?.[part], translations) ?? key).replace(/{{(\w+)}}/g, (_, field) => opts[field] ?? ''); },
  save(kind, item) { state.calls.push({ kind, item }); return new Promise(resolve => { state.resolve = () => resolve({ ...item, id: 'saved-row' }); }); },
};
const { default: ProfileEdit } = await import('../src/pages/profile/ProfileEdit.tsx');
async function input(id, value) {
  const element = document.getElementById(id);
  await React.act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
for (const kind of ['experience', 'education']) {
  test(`${kind} save is single-flight and preserves edits in other CV rows`, async () => {
    state.calls = [];
    state.experiences = [{ title: 'First job', company: '', start_date: '2026-01-01', user_id: 'owner' }, { title: 'Second job', company: '', start_date: '2026-01-01', user_id: 'owner' }];
    state.education = [{ institution: 'First school', degree: 'Exam', start_year: 2020, user_id: 'owner' }, { institution: 'Second school', degree: 'Exam', start_year: 2021, user_id: 'owner' }];
    const root = createRoot(document.getElementById('root'));
    try {
      await React.act(async () => root.render(h(MemoryRouter, { initialEntries: ['/profile/edit?tab='+kind] }, h(ProfileEdit))));
      const label = state.translate(`profileEdit.${kind}.save`);
      const save = [...document.querySelectorAll('button')].find(node => node.textContent.trim() === label);
      assert.ok(save, 'Save action is visible for the selected CV tab');
      await React.act(async () => { save.click(); save.click(); });
      assert.equal(state.calls.length, 1, 'Rapid clicks must create only one database row');
      assert.ok(save.disabled, 'Pending save is visibly disabled');
      const otherField = (kind === 'experience' ? 'title' : 'institution')+'-1';
      await input(otherField, 'Other row draft changed while saving');
      await React.act(async () => state.resolve());
      assert.equal(document.getElementById(otherField).value, 'Other row draft changed while saving');
      assert.equal(document.querySelectorAll('fieldset').length, 2);
    } finally { await React.act(async () => root.unmount()); }
  });
}
