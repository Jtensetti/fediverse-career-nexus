import test from 'node:test';
import assert from 'node:assert/strict';
import { isDemoUser, isUnclaimedSeedCompany } from './demo-selection.mjs';
test('cleanup requires both the seed marker and reserved demo email domain', () => {
  assert.equal(isDemoUser({ email: 'alice@demo.nolto.local', user_metadata: { seeded: true } }), true);
  assert.equal(isDemoUser({ email: 'real@example.org', user_metadata: { seeded: true } }), false);
  assert.equal(isDemoUser({ email: 'alice@demo.nolto.local', user_metadata: {} }), false);
  assert.equal(isDemoUser({ email: 'alice@demo.nolto.local.attacker.org', user_metadata: { seeded: true } }), false);
});
test('a familiar slug alone never authorizes deleting an organization', () => {
  const original = { slug: 'nordlys-labs', name: 'Nordlys Labs', claim_status: 'unclaimed', logo_url: 'https://api.dicebear.com/9.x/shapes/svg?seed=nordlys-labs' };
  assert.equal(isUnclaimedSeedCompany(original), true);
  for (const changes of [{ claim_status: 'claimed' }, { name: 'Real organization' }, { verified_at: '2026-09-21' }, { logo_url: 'https://real.example/logo.png' }]) assert.equal(isUnclaimedSeedCompany({ ...original, ...changes }), false);
});
