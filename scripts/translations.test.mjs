import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const languages = ['sv', 'en', 'fr', 'de', 'nl', 'es', 'ja', 'it'];
const resources = Object.fromEntries(languages.map(language => [language, JSON.parse(readFileSync(join(root, 'i18n', 'locales', language + '.json'), 'utf8'))]));
const lookup = (language, key) => key.split('.').reduce((value, part) => value?.[part], resources[language]);

function leaves(value, prefix = '', out = new Map()) {
  if (typeof value === 'string') out.set(prefix, value);
  else if (Array.isArray(value)) value.forEach((item, index) => leaves(item, `${prefix}[${index}]`, out));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) leaves(item, prefix ? `${prefix}.${key}` : key, out);
  return out;
}
const flat = Object.fromEntries(languages.map(language => [language, leaves(resources[language])]));
const placeholders = value => [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).concat([...value.matchAll(/<\/?\d+>/g)].map(match => match[0])).sort();

const references = new Map();
const hardcoded = [];
const TRANSLATORS = ['t', 'i18n.t', 'tx'];
// Brand, protocol and product names are intentionally not translated.
const LITERAL_ALLOW = /^(Nolto|Mastodon|Bluesky|ActivityPub|WebFinger|GitHub|LinkedIn|JSON|CSV|ZIP|MFA|GDPR|OK|URL|Google|Apple|TOTP|RSS|HTML|Markdown|Phanpy|Elk|Ivory|Tusky|IceCubes|AT Protocol|Nolto & Mastodon|Nolto\.social|nolto\.social|Center for Nonviolent Communication)$/;
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { if (!['i18n', 'integrations'].includes(entry.name)) scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node) {
      if (ts.isCallExpression(node) && TRANSLATORS.includes(node.expression.getText(source)) && node.arguments.length) {
        function add(argument) {
          if (ts.isStringLiteral(argument)) references.set(argument.text, file);
          if (ts.isConditionalExpression(argument)) { add(argument.whenTrue); add(argument.whenFalse); }
        }
        add(node.arguments[0]);
      }
      if (ts.isJsxText(node)) {
        const text = node.getText(source).replace(/\s+/g, ' ').trim();
        const parent = ts.isJsxElement(node.parent) ? node.parent.openingElement.tagName.getText(source) : '';
        if (/[A-Za-zÅÄÖåäö]/.test(text) && !LITERAL_ALLOW.test(text) && !['code', 'pre', 'kbd', 'samp'].includes(parent) && !/^[@#/]|^https?:|@.+\./.test(text)) {
          hardcoded.push(`${relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1} ${text.slice(0, 60)}`);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
scan(root);

test('every locale has exactly the same keys as English', () => {
  for (const language of languages) {
    const missing = [...flat.en.keys()].filter(key => !flat[language].has(key) && !(language === 'sv' && key.startsWith('legalDocs.')));
    // The authoritative Swedish legal text is structured into more sections than the English rendering.
    const extra = [...flat[language].keys()].filter(key => !flat.en.has(key) && !(language === 'sv' && key.startsWith('legalDocs.')));
    assert.deepEqual(missing, [], `${language} is missing keys`);
    assert.deepEqual(extra, [], `${language} has keys absent from en`);
  }
});

test('literal translation references resolve in all supported languages', () => {
  const missing = [];
  for (const [key, file] of references) for (const language of languages) {
    const value = lookup(language, key);
    if (typeof value !== 'string' && typeof lookup(language, key + '_one') !== 'string' && !(value && typeof value === 'object')) missing.push(`${language}: ${key} (${relative(root, file)})`);
  }
  assert.deepEqual(missing, [], 'Add copy to every language file instead of relying on a hardcoded fallback');
});

test('all languages use the same interpolation variables and markup tags', () => {
  const mismatches = [];
  for (const [key, english] of flat.en) for (const language of languages) {
    const value = flat[language].get(key);
    if (typeof value === 'string' && JSON.stringify(placeholders(value)) !== JSON.stringify(placeholders(english))) mismatches.push(`${language}: ${key}`);
  }
  assert.deepEqual(mismatches, []);
});

test('plural forms exist wherever English defines them', () => {
  for (const key of flat.en.keys()) if (key.endsWith('_one')) {
    const other = key.replace(/_one$/, '_other');
    for (const language of languages) assert.ok(flat[language].has(other), `${language}: ${other}`);
  }
});

test('translations are not English copies', () => {
  for (const language of languages.filter(language => language !== 'en')) {
    const copied = [...flat.en].filter(([key, english]) => english.length > 24 && /\s/.test(english) && flat[language].get(key) === english).map(([key]) => key);
    assert.ok(copied.length <= 10, `${language}: ${copied.length} long strings identical to English, e.g. ${copied.slice(0, 5).join(', ')}`);
  }
});

test('hardcoded JSX text inventory does not grow', () => {
  // Remaining items are reported honestly; lower this budget as they are extracted.
  const BUDGET = 40;
  if (hardcoded.length) console.log(`Remaining hardcoded JSX text nodes (${hardcoded.length}):\n  ` + hardcoded.join('\n  '));
  assert.ok(hardcoded.length <= BUDGET, `${hardcoded.length} hardcoded JSX text nodes (budget ${BUDGET})`);
});
