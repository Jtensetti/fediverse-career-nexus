import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import * as pgp from 'openpgp';
import { createInboxKey, unlockInboxKey, readInboxPublicKey, sealPrivateMessage, openPrivateMessage } from '../src/lib/privateMessages.ts';

const phrase = 'river orchard lantern meadow 4827';
const text = 'Privat rekryteringsmeddelande – inte läsbart i databasen.';
let alice, bob, outsider, binding, sealed;
before(async () => {
  const keys = await Promise.all(['alice', 'bob', 'outsider'].map(async id => {
    const backup = await createInboxKey(id, phrase);
    return { backup, privateKey: await unlockInboxKey(backup, phrase), publicKey: await readInboxPublicKey(backup.public_key, backup.fingerprint) };
  }));
  [alice, bob, outsider] = keys;
  binding = { id: crypto.randomUUID(), sender_id: 'alice', recipient_id: 'bob', job_conversation_id: null,
    sender_key_fingerprint: alice.backup.fingerprint, recipient_key_fingerprint: bob.backup.fingerprint };
  sealed = await sealPrivateMessage(binding, text, alice.privateKey, alice.publicKey, bob.publicKey);
});

test('only the two intended participants can read a signed message', async () => {
  assert.equal(await openPrivateMessage(sealed, alice.privateKey, alice.publicKey), text);
  assert.equal(await openPrivateMessage(sealed, bob.privateKey, alice.publicKey), text);
  await assert.rejects(openPrivateMessage(sealed, outsider.privateKey, alice.publicKey));
  assert.equal(sealed.encrypted_content.includes(text), false);
  const parsed = await pgp.readMessage({ armoredMessage: sealed.encrypted_content });
  assert.equal(parsed.getEncryptionKeyIDs().length, 2);
});

test('backups contain encrypted secret packets; a wrong phrase cannot unlock them', async () => {
  const stored = await pgp.readPrivateKey({ armoredKey: alice.backup.encrypted_private_key });
  for (const key of stored.getKeys()) assert.equal(key.keyPacket.isDecrypted(), false);
  assert.equal(JSON.stringify(alice.backup).includes(phrase), false);
  await assert.rejects(unlockInboxKey(alice.backup, 'wrong phrase of adequate length'));
  await assert.rejects(unlockInboxKey({ ...alice.backup, public_key: bob.backup.public_key }, phrase));
});

test('moving ciphertext to another row, sender, recipient or job conversation is rejected', async () => {
  for (const field of ['id', 'sender_id', 'recipient_id', 'job_conversation_id']) {
    await assert.rejects(openPrivateMessage({ ...sealed, [field]: 'different-context' }, bob.privateKey, alice.publicKey));
  }
  await assert.rejects(openPrivateMessage(sealed, bob.privateKey, outsider.publicKey));
});

test('unsigned and forged messages cannot impersonate a sender', async () => {
  const message = await pgp.createMessage({ text: JSON.stringify({ schema: 'nolto-private-message/1', ...binding, text }) });
  const unsigned = await pgp.encrypt({ message, encryptionKeys: [alice.publicKey, bob.publicKey], format: 'armored' });
  await assert.rejects(openPrivateMessage({ ...sealed, encrypted_content: unsigned }, bob.privateKey, alice.publicKey));
  const forged = await pgp.encrypt({ message, encryptionKeys: [alice.publicKey, bob.publicKey], signingKeys: outsider.privateKey, format: 'armored' });
  await assert.rejects(openPrivateMessage({ ...sealed, encrypted_content: forged }, bob.privateKey, alice.publicKey));
});

test('ciphertext corruption fails closed and repeated encryption uses fresh randomness', async () => {
  const next = await sealPrivateMessage(binding, text, alice.privateKey, alice.publicKey, bob.publicKey);
  assert.notEqual(next.encrypted_content, sealed.encrypted_content);
  const offset = Math.floor(sealed.encrypted_content.length / 2);
  const damaged = sealed.encrypted_content.slice(0, offset) +
    (sealed.encrypted_content[offset] === 'A' ? 'B' : 'A') + sealed.encrypted_content.slice(offset + 1);
  await assert.rejects(openPrivateMessage({ ...sealed, encrypted_content: damaged }, bob.privateKey, alice.publicKey));
});
