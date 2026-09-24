import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../src/', import.meta.url));
const languages = ['sv', 'en'];
const resources = Object.fromEntries(languages.map(language => [language, JSON.parse(readFileSync(join(root, 'i18n', 'locales', language + '.json'), 'utf8'))]));
const lookup = (language, key) => key.split('.').reduce((value, part) => value?.[part], resources[language]);
const references = new Map();
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) { scan(file); continue; }
    if (!/\.tsx?$/.test(file)) continue;
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isCallExpression(node) && ['t', 'i18n.t'].includes(node.expression.getText(source)) && node.arguments.length) {
        function add(argument) {
          if (ts.isStringLiteral(argument)) references.set(argument.text, file);
          if (ts.isConditionalExpression(argument)) { add(argument.whenTrue); add(argument.whenFalse); }
        }
        add(node.arguments[0]);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
}
scan(root);

test('literal translation references resolve in both supported languages', () => {
  const missing = [];
  for (const [key, file] of references) for (const language of languages) {
    if (typeof lookup(language, key) !== 'string' && typeof lookup(language, key + '_one') !== 'string') missing.push(`${language}: ${key} (${file})`);
  }
  assert.deepEqual(missing, [], 'Add copy to both language files instead of relying on a hardcoded fallback');
});

test('Swedish and English copy use matching interpolation variables', () => {
  for (const key of references.keys()) {
    const values = languages.map(language => lookup(language, key));
    if (!values.every(value => typeof value === 'string')) continue;
    const placeholders = values.map(value => [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).sort());
    assert.deepEqual(placeholders[0], placeholders[1], key);
  }
});
