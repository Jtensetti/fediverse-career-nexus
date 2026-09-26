import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { createInstance } from 'i18next';

const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.invalid/profile/edit' });
for (const name of ['window', 'document', 'Element', 'FileList', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Node', 'NodeFilter', 'DocumentFragment', 'Event', 'MouseEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver']) globalThis[name] = dom.window[name];
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
HTMLElement.prototype.scrollIntoView = function () {};
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = function () {};
HTMLElement.prototype.releasePointerCapture = function () {};
const languages = ['sv', 'en', 'fr', 'de', 'nl', 'es', 'ja', 'it'];
const resources = Object.fromEntries(languages.map(language => [language, {
  translation: JSON.parse(readFileSync(new URL(`../src/i18n/locales/${language}.json`, import.meta.url), 'utf8')),
}]));
const i18n = createInstance();
await i18n.init({ resources, lng: 'sv', fallbackLng: false, interpolation: { escapeValue: false } });
globalThis.localizationTestI18n = i18n;
globalThis.localizationDeleteCalls = 0;
const mocks = {
  'sonner': 'export const toast={success(){},error(){}};',
  '@/i18n': 'export default globalThis.localizationTestI18n;',
  '@/contexts/AuthContext': 'export const useAuth=()=>({signOut:async()=>{}});',
  '@/services/auth/accountService': 'export const deleteAccount=async()=>{globalThis.localizationDeleteCalls++;return {success:false};};',
  '@/services/moderation/reportService': 'export const submitReport=async()=>true;',
  '@/services/company/companyService': 'export const isSlugAvailable=async()=>true; export const generateSlug=name=>name.toLowerCase().replaceAll(" ","-");',
};
registerHooks({
  resolve(specifier, context, next) {
    if (specifier in mocks) return { url: 'localization-mock:' + specifier, shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const stem = new URL('../src/' + specifier.slice(2), import.meta.url);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const stem = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '.tsx', '/index.ts']) if (existsSync(fileURLToPath(stem) + suffix)) return { url: stem.href + suffix, shortCircuit: true };
    }
    return next(specifier, context.parentURL?.startsWith('localization-mock:') ? { ...context, parentURL: import.meta.url } : context);
  },
  load(url, context, next) {
    if (url.startsWith('localization-mock:')) return { format: 'module', source: mocks[url.slice('localization-mock:'.length)], shortCircuit: true };
    if (url.endsWith('.tsx')) return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText };
    return next(url, context);
  },
});

const React = await import('react');
const { createRoot } = await import('react-dom/client');
const { MemoryRouter } = await import('react-router-dom');
const { I18nextProvider } = await import('react-i18next');
const { default: DeleteAccountSection } = await import('../src/components/settings/DeleteAccountSection.tsx');
const { ReportDialog } = await import('../src/components/common/ReportDialog.tsx');
const { default: ConfirmStep } = await import('../src/components/LinkedInImport/ImportSteps/ConfirmStep.tsx');
const { default: CompanyForm } = await import('../src/components/company/CompanyForm.tsx');
const { default: CompanyCard } = await import('../src/components/company/CompanyCard.tsx');
const { default: CompanySearchFilter } = await import('../src/components/company/CompanySearchFilter.tsx');
const { organisationTypeGroups, companySizeOptions } = await import('../src/lib/companyOptions.ts');
const h = React.createElement;
const act = React.act;
const button = (label, parent = document) => [...parent.querySelectorAll('button')].find(node => node.textContent.trim() === label);

async function render(element, language) {
  await i18n.changeLanguage(language);
  const root = createRoot(document.getElementById('root'));
  await act(async () => root.render(h(I18nextProvider, { i18n }, h(MemoryRouter, {}, element))));
  return async () => { await act(async () => root.unmount()); };
}
async function enterConfirmation(value) {
  const input = document.getElementById('delete-confirmation');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

test('every displayed confirmation word works and still requires acknowledgement and a second confirmation', async () => {
  for (const language of languages) {
    const cleanup = await render(h(DeleteAccountSection), language);
    try {
      const trigger = button(i18n.t('ui.deleteAccountSection.raderaMittKonto'));
      const word = document.getElementById('delete-confirmation').placeholder;
      assert.ok(word.length > 0);
      assert.ok(document.querySelector('label[for="delete-confirmation"]').textContent.includes(word));
      await enterConfirmation(word);
      assert.equal(trigger.disabled, true, `${language}: acknowledgement is required`);
      await act(async () => document.getElementById('understand').click());
      assert.equal(trigger.disabled, false, `${language}: the displayed word must be accepted`);
      await enterConfirmation(word + '!');
      assert.equal(trigger.disabled, true, `${language}: mismatched words must be rejected`);
      await enterConfirmation(word);
      await act(async () => trigger.click());
      assert.ok(document.querySelector('[role="alertdialog"]'), 'the second confirmation remains mandatory');
      assert.equal(globalThis.localizationDeleteCalls, 0);
      await act(async () => button(i18n.t('ui.deleteAccountSection.avbryt'), document.querySelector('[role="alertdialog"]')).click());
      assert.equal(globalThis.localizationDeleteCalls, 0, 'cancelling must not call deletion');
    } finally { await cleanup(); }
  }
});

test('changing language invalidates a previously entered confirmation word', async () => {
  const cleanup = await render(h(DeleteAccountSection), 'sv');
  try {
    await enterConfirmation(document.getElementById('delete-confirmation').placeholder);
    await act(async () => document.getElementById('understand').click());
    await act(async () => i18n.changeLanguage('en'));
    assert.equal(button(i18n.t('ui.deleteAccountSection.raderaMittKonto')).disabled, true);
    await enterConfirmation(document.getElementById('delete-confirmation').placeholder);
    assert.equal(button(i18n.t('ui.deleteAccountSection.raderaMittKonto')).disabled, false);
    assert.equal(globalThis.localizationDeleteCalls, 0);
  } finally { await cleanup(); }
});

test('reports render full localized titles and interpolate untrusted titles as text', async () => {
  for (const language of languages) {
    const cleanup = await render(h(ReportDialog, {
      contentType: 'job', contentId: 'fixture', contentTitle: '<img src=x onerror=alert(1)>', open: true, onOpenChange() {},
    }), language);
    try {
      const dialog = document.querySelector('[role="dialog"]');
      assert.equal(dialog.querySelector('h2').textContent, i18n.t('ui.reportDialog.reportJob'));
      assert.ok(dialog.textContent.includes('<img src=x onerror=alert(1)>'));
      assert.equal(dialog.querySelector('img'), null);
      assert.equal(button(i18n.t('ui.reportDialog.skickaRapport'), dialog).disabled, true, 'a reason remains required');
    } finally { await cleanup(); }
  }
});

async function chooseOption(trigger, label) {
  await act(async () => trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
  const option = [...document.querySelectorAll('[role="option"]')].find(node => node.textContent === label);
  assert.ok(option, `Missing selectable option: ${label}`);
  await act(async () => option.click());
}

test('business types are selectable and submit stable values in every language', async () => {
  const values = organisationTypeGroups[0].options.map(option => option.value);
  for (const language of languages) {
    let saved;
    const cleanup = await render(h(CompanyForm, {
      defaultValues: { name: 'Test organisation', slug: 'test-organisation' },
      isEdit: true, onSubmit: async data => { saved = data; },
    }), language);
    try {
      const trigger = document.querySelector('[role="combobox"]');
      for (const value of values) {
        const option = organisationTypeGroups.flatMap(group => group.options).find(option => option.value === value);
        await chooseOption(trigger, i18n.t(option.labelKey));
        await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        assert.equal(saved?.industry, value, `${language}: translated labels must not become stored values`);
      }
    } finally { await cleanup(); }
  }
});

test('language switches preserve legacy organisation values and free-text categories when editing', async () => {
  for (const value of ['Kommun', 'Konsultbolag', 'Older custom category that is longer than fifty characters and must survive editing']) {
    let saved;
    const cleanup = await render(h(CompanyForm, {
      defaultValues: { name: 'Existing organisation', slug: 'existing-organisation', industry: value },
      isEdit: true, onSubmit: async data => { saved = data; },
    }), 'sv');
    try {
      await act(async () => i18n.changeLanguage('en'));
      const displayed = document.querySelector('[role="combobox"]').textContent;
      assert.ok(displayed.includes(value === 'Kommun' ? 'Municipality' : value === 'Konsultbolag' ? 'Consultancy' : value));
      await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      assert.equal(saved?.industry, value);
    } finally { await cleanup(); }
  }
});

test('organisation cards localize saved categories and filter sizes match stored ranges', async () => {
  const cleanup = await render(h(React.Fragment, {},
    h(CompanyCard, { company: { name: 'Company fixture', slug: 'company-fixture', industry: 'listed_company', size: '501-1000', follower_count: 0 } }),
    h(CompanySearchFilter, { filters: {}, onFilterChange() {} }),
  ), 'en');
  try {
    assert.ok(document.querySelector('a').textContent.includes(i18n.t('companyTypes.listedCompany')));
    await act(async () => document.getElementById('company-size').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    const options = [...document.querySelectorAll('[role="option"]')].map(node => node.textContent);
    for (const option of companySizeOptions) assert.ok(options.includes(i18n.t(option.labelKey)), `Missing size ${option.value}`);
    assert.equal(companySizeOptions.length, 8);
    assert.ok(options.some(label => /501.+1[ ,]?000/.test(label)), '501–1000 must be an independent filter');
    assert.ok(!options.some(label => /20[ ,]?000/.test(label)), 'filter must not display a different stored range');
  } finally { await cleanup(); }
});

test('organisation form explains the server address rules in every language', async () => {
  for (const language of languages) {
    for (const [extra, message] of [
      [{ slug: 'ab' }, 'companyForm.urlTooShort'],
      [{ slug: '-invalid' }, 'companyForm.urlCharacters'],
      [{ slug: 'invalid-' }, 'companyForm.urlCharacters'],
      [{ website: 'http://example.com' }, 'companyForm.httpsRequired'],
      [{ founded_year: new Date().getFullYear() + 1 }, 'companyForm.validYear'],
    ]) {
      let calls = 0;
      const cleanup = await render(h(CompanyForm, {
        defaultValues: { name: 'Validation fixture', slug: 'validation-fixture', ...extra },
        isEdit: true, onSubmit: async () => { calls++; },
      }), language);
      try {
        await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        assert.equal(calls, 0, `${language}: invalid server values must not be submitted`);
        assert.ok(document.body.textContent.includes(i18n.t(message, { min: 1000, max: new Date().getFullYear() })), `${language}: ${message}`);
      } finally { await cleanup(); }
    }
    let saved;
    const cleanup = await render(h(CompanyForm, {
      defaultValues: { name: 'Old institution', slug: 'old-institution', website: 'https://example.com', founded_year: 1200 },
      isEdit: true, onSubmit: async value => { saved = value; },
    }), language);
    try {
      await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      assert.equal(saved?.founded_year, 1200, 'the backend accepts institutions founded before 1800');
      assert.equal(document.querySelector('input[name="founded_year"]').checkValidity(), true, 'native input constraints must agree with the schema');
    } finally { await cleanup(); }
  }
});

test('LinkedIn import results render complete translated totals without Swedish status fragments', async () => {
  for (const language of languages) {
    const cleanup = await render(h(ConfirmStep, {
      result: { success: true, errors: [], imported: { profile: true, experiences: 1, education: 2, skills: 3, articles: 1 } },
      onClose() {},
    }), language);
    try {
      const text = document.body.textContent;
      assert.ok(text.includes(i18n.t('ui.confirmStep.importedTotal', { total: 8 })));
      assert.ok(text.includes(i18n.t('ui.confirmStep.updated')));
      assert.ok(text.includes(i18n.t('ui.confirmStep.addedTotal', { total: 1 })));
      assert.ok(text.includes(i18n.t('ui.confirmStep.draftTotal', { total: 1 })));
      if (language !== 'sv') assert.doesNotMatch(text, /Uppdaterad|tillagda|utkast|Hoppades över/);
    } finally { await cleanup(); }
  }
});
