import { assertEquals } from "https://deno.land/std@0.203.0/testing/asserts.ts";
import { createActorObject } from "../functions/actor/utils.ts";

Deno.test('createActorObject builds minimal actor', () => {
  const profile = { username: 'bob', fullname: 'Bob', avatar_url: null };
  const actor = { id: '1', created_at: new Date().toISOString() };
  const obj = createActorObject(profile, actor, 'example.com', 'https:');
  assertEquals(obj.preferredUsername, 'bob');
  assertEquals(obj.type, 'Person');
});
