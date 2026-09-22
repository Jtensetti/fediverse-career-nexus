import { strict as assert } from 'node:assert';
import { localObjectId, objectAddress, reactionActivity, resolveReplyAddress } from '../functions/_shared/federated-interactions.ts';
import { localObject } from '../functions/_shared/local-content.ts';
const id = '55555555-0001-4000-8000-000000000001';

Deno.test('federated reactions identify the exact canonical object and Undo embeds the original Like', () => {
  Deno.env.set('FEDERATION_DOMAIN', 'nolto.social');
  assert.equal(localObjectId(`https://nolto.social/functions/v1/objects/${id}`), id);
  for (const url of [`https://evil.example/functions/v1/objects/${id}`, `https://nolto.social/other/${id}`, `https://evil@nolto.social/functions/v1/objects/${id}`, `https://nolto.social/functions/v1/objects/${id}?extra=1`]) assert.equal(localObjectId(url), null);
  const snapshot = { reaction_id: id, target_id: id, remote_object_id: 'https://mastodon.example/users/alice/statuses/123', target_remote: true, target_actor_url: 'https://mastodon.example/users/alice', target_username: 'alice' };
  const like = reactionActivity('bob', snapshot), undo = reactionActivity('bob', snapshot, true);
  assert.equal(like.object, snapshot.remote_object_id); assert.deepEqual(undo.object, like);
  assert.deepEqual(like.to, [snapshot.target_actor_url]);
  assert.throws(() => objectAddress({ id, remote_object_id: 'http://localhost/private' }));
});

Deno.test('reply delivery replaces local row IDs with remote URLs and includes the remote author', async () => {
  Deno.env.set('FEDERATION_DOMAIN', 'nolto.social');
  const db = { from: (table: string) => { const result = { select: () => result, eq: () => result,
    maybeSingle: () => Promise.resolve({ data: { id, remote_object_id: 'https://mastodon.example/notes/123', attributed_to: 'actor' } }),
    single: () => Promise.resolve({ data: { is_remote: true, remote_actor_url: 'https://mastodon.example/users/alice' } }) }; assert.ok(['actors','ap_objects'].includes(table)); return result; } };
  const row = { id: '55555555-0002-4000-8000-000000000002', content: { type: 'Note', content: 'Reply', inReplyTo: id, rootPost: id } };
  const enriched = await resolveReplyAddress(db as unknown as Parameters<typeof resolveReplyAddress>[0], row);
  const output = localObject(enriched, 'bob');
  assert.equal(output.inReplyTo, 'https://mastodon.example/notes/123'); assert.equal(output.rootPost, undefined);
  assert.ok((output.cc as string[]).includes('https://mastodon.example/users/alice'));
  assert.equal(row.content.inReplyTo, id);
});
