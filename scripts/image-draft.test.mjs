import assert from 'node:assert/strict';
import test from 'node:test';
import { ImageDraft } from '../src/lib/imageDraft.ts';
import { compressImage } from '../src/lib/imageCompression.ts';

const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const file = name => new File(['image'], name, { type: 'image/jpeg' });
const uploaded = id => ({ id, url: `https://media.example.com/${id}`, path: id, mediaType: 'image/jpeg', size: 5 });

test('selection starts upload while the post is still being composed; publish waits for it', async () => {
  const transfer = deferred(); let uploads = 0;
  const draft = new ImageDraft({ compress: async image => image, upload: async () => { uploads++; return transfer.promise; }, discard: async () => {}, changed: () => {} });
  draft.select(file('first.jpg'));
  await Promise.resolve();
  assert.equal(uploads, 1); assert.equal(draft.state.phase, 'uploading');
  let published = false;
  const publish = draft.ready().then(image => { published = true; return image; });
  await Promise.resolve(); assert.equal(published, false);
  transfer.resolve(uploaded('first'));
  assert.equal((await publish).id, 'first');
  assert.equal((await draft.ready()).id, 'first'); assert.equal(uploads, 1);
});

test('a replaced or removed image cannot overwrite the current draft or survive a late upload', async () => {
  const first = deferred(), second = deferred(), discarded = [];
  const draft = new ImageDraft({ compress: async image => image, upload: image => image.name === 'first.jpg' ? first.promise : second.promise, discard: async image => { discarded.push(image.id); }, changed: () => {} });
  draft.select(file('first.jpg')); await Promise.resolve();
  draft.select(file('second.jpg')); await Promise.resolve();
  second.resolve(uploaded('second')); await draft.ready();
  first.resolve(uploaded('first')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(draft.state.upload.id, 'second'); assert.deepEqual(discarded, ['first']);
  draft.clear(); assert.equal(draft.state.phase, 'empty'); assert.deepEqual(discarded, ['first', 'second']);
  const pending = deferred();
  const removed = new ImageDraft({ compress: async image => image, upload: () => pending.promise, discard: async image => { discarded.push(image.id); }, changed: () => {} });
  removed.select(file('removed.jpg')); await Promise.resolve(); removed.dispose();
  pending.resolve(uploaded('removed')); await new Promise(resolve => setImmediate(resolve));
  assert.equal(discarded.at(-1), 'removed'); assert.equal(removed.state.phase, 'empty');
});

test('failed compression never uploads an original; upload errors remain retryable', async () => {
  let uploads = 0, brokenCompression = true;
  const draft = new ImageDraft({ compress: async image => { if (brokenCompression) throw new Error('decode failed'); return image; }, upload: async () => { if (++uploads === 1) throw new Error('offline'); return uploaded('retried'); }, discard: async () => {}, changed: () => {} });
  draft.select(file('first.jpg')); await assert.rejects(draft.ready(), /decode failed/); assert.equal(uploads, 0);
  brokenCompression = false; draft.retry(); await assert.rejects(draft.ready(), /offline/);
  draft.retry(); assert.equal((await draft.ready()).id, 'retried');
});

test('compression re-encodes small images and reduces dimensions until the byte limit is met', async () => {
  const originals = { Image: globalThis.Image, document: globalThis.document };
  let draws = 0; const sizes = [];
  const canvas = { width: 0, height: 0,
    getContext: () => ({ fillRect() {}, drawImage() { draws++; }, }),
    toBlob(callback, type) { sizes.push([canvas.width, canvas.height]); callback(new Blob(['x'.repeat(canvas.width > 1500 ? 600000 : 400000)], { type })); },
  };
  globalThis.Image = class { naturalWidth = 6000; naturalHeight = 4000; set src(value) { if (value) queueMicrotask(() => this.onload()); } };
  globalThis.document = { createElement: () => canvas };
  try {
    const result = await compressImage(file('photo.png'));
    assert.equal(result.type, 'image/jpeg'); assert.equal(result.name, 'photo.jpg'); assert.ok(result.size <= 512000);
    assert.ok(draws >= 2); assert.ok(sizes.every(([w,h]) => w <= 1920 && h <= 1920));
  } finally { globalThis.Image = originals.Image; globalThis.document = originals.document; }
});
