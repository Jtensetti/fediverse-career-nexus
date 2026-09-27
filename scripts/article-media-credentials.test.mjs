import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('', { url: 'https://nolto.social' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
registerHooks({ resolve(specifier, context, next) {
  if (specifier === './mediaCredentials') return { url: new URL('../src/lib/mediaCredentials.ts', import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
} });
const { articleHtml } = await import('../src/lib/articleHtml.ts');
test('article media is anonymous on first insertion and untrusted attributes remain sanitized', () => {
  const backend = 'https://media.supabase.co';
  const safe = articleHtml(`<img src="${backend}/functions/v1/public-media/avatars/a.png" crossorigin="use-credentials" onerror="alert(1)"><img src="https://other.example/a.png"><script>alert(1)</script>`, backend);
  const template = document.createElement('template'); template.innerHTML = safe;
  const images = template.content.querySelectorAll('img');
  assert.equal(images[0].getAttribute('crossorigin'), 'anonymous');
  assert.equal(images[0].getAttribute('onerror'), null);
  assert.equal(images[1].getAttribute('crossorigin'), null);
  assert.equal(template.content.querySelector('script'), null);
});
