import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mediaCrossOrigin } from '../src/lib/mediaCredentials.ts';

test('avatar preload sets anonymous CORS before starting the backend image request', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://nolto.social' });
  const previous = { window: globalThis.window, document: globalThis.document, act: globalThis.IS_REACT_ACT_ENVIRONMENT };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const loads = [];
  dom.window.Image = class extends dom.window.EventTarget {
    crossOrigin = null;
    set src(value) { loads.push({ src: value, crossOrigin: this.crossOrigin }); }
  };
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const Avatar = await import('@radix-ui/react-avatar');
  const root = createRoot(dom.window.document.getElementById('root'));
  try {
    const src = 'https://media.supabase.co/functions/v1/public-media/avatars/a.png';
    await React.act(async () => root.render(React.createElement(Avatar.Root, null,
      React.createElement(Avatar.Image, { src, crossOrigin: mediaCrossOrigin(src, 'https://media.supabase.co') }),
      React.createElement(Avatar.Fallback, null, 'Fallback'))));
    assert.deepEqual(loads, [{ src, crossOrigin: 'anonymous' }]);
    assert.equal(dom.window.document.getElementById('root').textContent, 'Fallback');
  } finally {
    await React.act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    dom.window.close();
  }
});
