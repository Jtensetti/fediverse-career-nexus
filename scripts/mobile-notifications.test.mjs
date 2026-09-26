import test from 'node:test';
import assert from 'node:assert/strict';
import { isUuid, notificationPath, notificationTitle } from '../apps/mobile/notification-content.ts';
const id = '11111111-1111-4111-8111-111111111111';
const base = { id, type: 'reply', object_id: id, object_type: 'post', actor_id: null, read: false, created_at: '' };
test('mobile notification navigation accepts only internal resource identifiers', () => {
  assert.equal(notificationPath(base), `/post/${id}`);
  for (const malicious of ['https://evil.example', '//evil.example', '../../auth', '%2f%2fevil.example', 'javascript:alert(1)']) {
    assert.equal(notificationPath({ ...base, object_id: malicious, actor_id: malicious }), '/notifications');
    assert.equal(isUuid(malicious), false);
  }
  assert.equal(notificationPath({ ...base, type: 'message', actor_id: id }), `/messages/${id}`);
  assert.equal(notificationTitle('unrecognised'), 'Nytt på Nolto');
});
