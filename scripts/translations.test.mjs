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
const placeholders = value => [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).concat([...value.matchAll(/<\/?(?:\d+|[A-Za-z][A-Za-z0-9]*)>/g)].map(match => match[0])).sort();

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
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'userFacingErrorMessage' && ts.isStringLiteral(node.arguments?.[1])) references.set(node.arguments[1].text, file);
      if (ts.isNewExpression(node) && node.expression.getText(source) === 'UserFacingError' && ts.isStringLiteral(node.arguments?.[0])) references.set(node.arguments[0].text, file);
      if (ts.isJsxAttribute(node) && node.name.getText(source) === 'i18nKey' && node.initializer && ts.isStringLiteral(node.initializer)) references.set(node.initializer.text, file);
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

// Reviewed shared vocabulary, loanwords and technical names. Checking only long
// strings missed untranslated buttons such as "Accept", "Share" and "Saving".
// A new exception needs a language/context review; do not raise a copy budget.
const sharedVocabulary = Object.fromEntries(Object.entries({
  sv: 'Admin|Cache|Cookies|Hybrid|Info|Moderator|Normal|Organisation|Partition|Permanent|Region|Server|Status|System|Tips:|{{count}} server|{{count}} person',
  fr: '15. Contact|Action|Actions|Admin|Article|Articles|Cache|Collaboration|Compatible|Contact|Cookies|Description|Documentation|Freelance|Image|Info|Instances|Message|Messages|Newsletter|Normal|Notification|Notifications|OPEN SOURCE|Open Source|Open source|Organisation|Organisations|Partition|Permanent|Public|Services|Sessions|Suggestions|Suspensions|Tags|Total|Type|Vertical (Stories)|messages|req/24h',
  de: 'Admin|Cache|Community|Cookies|Domain|Feed|Feeds|Hybrid|Info|Jobs|Moderation|Moderator|Name|Newsletter|Normal|OPEN SOURCE|Open Source|Optional|Organisation|Partition|Permanent|Position|Region|Remote|Server|Status|System|System online|Tags|Team',
  nl: '1 week|10. Disclaimers|15. Contact|8. Privacy|Cache|Contact|Cookies|Database|Download JSON|Feed|Feeds|Filters|Freelance|Freelancer|Freelancers|Home|Info|Logs|Moderator|Moderators|OPEN SOURCE|Open Source|Open source|Permanent|Posts|Privacy|Privacy by Design|Self-hosting|Server|Status|Tags|Team|Tips:|Trace ID:|Type|Website|Week {{number}}|{{count}} server|{{count}} servers',
  es: 'Actor|Compatible|Cookies|Editor|Error|Feed|Feeds|Freelance|Freelancer|Freelancers|General|Legal|Normal|Personal|Roles|Total|Total:',
  ja: '',
  it: '8. Privacy|Cache|Database|Email|Feed|Freelance|Full-time|Home|Info|Newsletter|Nolto – home|OPEN SOURCE|Open Source|Open source|Part-time|Password|Post|Privacy|Privacy by Design|Self-hosting|Server|Username|follower|{{count}} server',
}).map(([language, words]) => [language, new Set(words.split('|'))]));
// Startup is an established business term in these locales.
for (const language of ['sv', 'fr', 'nl', 'es', 'it']) sharedVocabulary[language].add('Startup');
sharedVocabulary.de.add('Passphrase');
const sharedNames = new Set(['Nolto', 'Nolto.', 'ActivityPub', 'Fediverse', 'X/Twitter', 'URL', 'ms', 'nolto.social/organisation/', 'organisation.com']);

test('translations contain no unreviewed English copies, including short labels', () => {
  for (const language of languages.filter(language => language !== 'en')) {
    const copied = [...flat.en].filter(([key, english]) => {
      if (flat[language].get(key) !== english) return false;
      if (!/[A-Za-z]/.test(english.replace(/{{[^}]*}}/g, ''))) return false;
      // Reviewed domain examples and shared warning vocabulary, scoped to these keys.
      if (key === 'ui.blueskySignIn.namnBskySocial' && english === 'name.bsky.social') return false;
      if (key === 'ui.companyForm.organisationsnamn2' && english === 'organisation-name') return false;
      if (key === 'reviewUI.warningSpoilers' && ['sv', 'nl', 'es'].includes(language) && english === 'spoilers') return false;
      if (key === 'reviewUI.warningAlcohol' && ['nl', 'es'].includes(language) && english === 'alcohol') return false;
      if (key === 'reviewUI.warningViolence' && language === 'fr' && english === 'violence') return false;
      if (key.startsWith('reviewUI.votes_') && language === 'fr') return false;
      if (sharedNames.has(english) || sharedVocabulary[language].has(english) || /^https?:\/\//.test(english)) return false;
      // URL path examples deliberately use ASCII; the field's label/help is localized.
      if (/\.(urlSlugPlaceholder|slugPlaceholder|addressPlaceholder)$/.test(key) && /^[a-z0-9-]+$/.test(english)) return false;
      return true;
    }).map(([key, value]) => `${key}: ${value}`);
    assert.deepEqual(copied, [], `${language}: review copied English text in context`);
  }
});

test('hardcoded JSX text inventory does not grow', () => {
  // Product and protocol names are explicitly allowlisted above.
  const BUDGET = 0;
  if (hardcoded.length) console.log(`Remaining hardcoded JSX text nodes (${hardcoded.length}):\n  ` + hardcoded.join('\n  '));
  assert.ok(hardcoded.length <= BUDGET, `${hardcoded.length} hardcoded JSX text nodes (budget ${BUDGET})`);
});
