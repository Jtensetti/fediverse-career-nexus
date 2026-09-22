import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('', { url: 'https://example.invalid' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.NodeFilter = dom.window.NodeFilter;
const { linkifyText, linkifyWithMarkdown, stripHtml } = await import('../src/lib/linkify.ts');

function rendered(input) {
  const root = document.createElement('div');
  root.innerHTML = linkifyWithMarkdown(input);
  return root;
}

test('new Markdown links cannot introduce executable URLs or attributes', () => {
  for (const payload of [
    '[click](javascript:alert(1))', '[click](data:text/html,test)',
    '[click](java&#x73;cript:alert(1))',
    '<a href="javascript:alert(1)" onclick="alert(1)">click</a>',
    '<img src=x onerror=alert(1)><svg onload=alert(1)>',
    '[click](https://example.invalid/"onmouseover="alert(1))',
  ]) {
    const root = rendered(payload);
    assert.equal(root.querySelector('script,img,svg,iframe,object,embed'), null);
    for (const element of root.querySelectorAll('*')) for (const attr of element.attributes) {
      assert.equal(/^on/i.test(attr.name), false);
      if (attr.name === 'href') assert.match(attr.value, /^(https?:|mailto:|[/?#])/i);
    }
  }
});

test('links, fragments and usernames inside an existing link stay intact', () => {
  const root = rendered('<a href="https://example.invalid/@alice#bio">@alice #bio</a> https://example.invalid/@bob#cv.');
  const links = [...root.querySelectorAll('a')];
  assert.equal(links.length, 2);
  assert.equal(links[0].getAttribute('href'), 'https://example.invalid/@alice#bio');
  assert.equal(links[0].textContent, '@alice #bio');
  assert.equal(links[1].getAttribute('href'), 'https://example.invalid/@bob#cv');
  assert.equal(root.querySelector('a a'), null);
  for (const link of links) assert.match(link.rel, /noopener/);
});

test('formatting and local links work without parsing code or attributes', () => {
  const root = rendered('**bold** _italic_ @alice #arbete [site](https://example.invalid) <code>@bob #code</code>');
  assert.equal(root.querySelector('strong').textContent, 'bold');
  assert.equal(root.querySelector('em').textContent, 'italic');
  assert.ok(root.querySelector('a[href="/profile/alice"]'));
  assert.ok(root.querySelector('a[href="/search?q=%23arbete"]'));
  assert.equal(root.querySelector('code').innerHTML, '@bob #code');
  assert.equal(linkifyText('**plain**'), '**plain**');
  assert.equal(rendered('&lt;img src=x onerror=alert(1)&gt;').querySelector('img'), null);
});


test('plain text previews decode entities without turning escaped markup into HTML', () => {
  assert.equal(stripHtml('<p>A &amp; B</p><p>&lt;img src=x onerror=alert(1)&gt;</p>'), 'A & B\n\n<img src=x onerror=alert(1)>');
  assert.equal(stripHtml('<script>alert(1)</script><p>Visible</p>'), 'Visible');
});
