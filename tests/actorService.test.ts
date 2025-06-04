import { createLocalActorObject } from '../src/services/actorService';

describe('createLocalActorObject', () => {
  it('creates a Person actor with expected fields', () => {
    const actor = createLocalActorObject({ username: 'alice', fullname: 'Alice' }, 'example.com');
    expect(actor.id).toBe('https://example.com/actor/alice');
    expect(actor.type).toBe('Person');
    expect(actor.preferredUsername).toBe('alice');
    expect(actor.followers).toContain('followers');
  });
});
