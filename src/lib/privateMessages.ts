import { UserFacingError } from './userFacingError.ts';
import type { Key, PrivateKey } from 'openpgp';

export const MESSAGE_ENCRYPTION = 'openpgp-v1';
const MAX_MESSAGE_BYTES = 10000;
const MAX_CIPHERTEXT_BYTES = 65536;
const encoder = new TextEncoder();
const pgp = () => import('openpgp');

export interface InboxKeyBackup {
  user_id: string;
  fingerprint: string;
  public_key: string;
  encrypted_private_key: string;
}

export interface MessageBinding {
  id: string;
  sender_id: string;
  recipient_id: string;
  job_conversation_id: string | null;
  sender_key_fingerprint: string;
  recipient_key_fingerprint: string;
}

export interface SealedMessage extends MessageBinding {
  encryption_version: typeof MESSAGE_ENCRYPTION;
  encrypted_content: string;
}

export async function createInboxKey(userId: string, passphrase: string): Promise<InboxKeyBackup> {
  if (passphrase.length < 16 || passphrase.length > 1024) throw new UserFacingError('runtimeErrors.passphraseLength');
  const openpgp = await pgp();
  const key = await openpgp.generateKey({
    type: 'ecc', curve: 'nistP256', userIDs: [{ name: `Nolto ${userId}` }],
    passphrase, format: 'armored',
    config: { aeadProtect: true, s2kIterationCountByte: 255 },
  });
  const publicKey = await openpgp.readKey({ armoredKey: key.publicKey });
  return { user_id: userId, fingerprint: publicKey.getFingerprint(), public_key: key.publicKey, encrypted_private_key: key.privateKey };
}

export async function readInboxPublicKey(armored: string, fingerprint: string): Promise<Key> {
  if (armored.length > 16384 || !/^[a-f0-9]{40,64}$/.test(fingerprint)) throw new UserFacingError('runtimeErrors.invalidKey');
  const key = await (await pgp()).readKey({ armoredKey: armored });
  if (key.isPrivate() || key.getFingerprint() !== fingerprint) throw new UserFacingError('runtimeErrors.fingerprintMismatch');
  await key.getEncryptionKey();
  return key;
}

export async function unlockInboxKey(backup: InboxKeyBackup, passphrase: string): Promise<PrivateKey> {
  const openpgp = await pgp();
  const stored = await openpgp.readPrivateKey({ armoredKey: backup.encrypted_private_key });
  if (stored.getFingerprint() !== backup.fingerprint || stored.isDecrypted()) throw new UserFacingError('runtimeErrors.invalidBackup');
  let key: PrivateKey;
  try { key = await openpgp.decryptKey({ privateKey: stored, passphrase }); }
  catch { throw new UserFacingError('runtimeErrors.wrongPassphrase'); }
  if (key.toPublic().armor() !== (await readInboxPublicKey(backup.public_key, backup.fingerprint)).armor()) {
    throw new UserFacingError('runtimeErrors.keyPairMismatch');
  }
  return key;
}

export async function sealPrivateMessage(binding: MessageBinding, text: string, privateKey: PrivateKey,
  senderKey: Key, recipientKey: Key): Promise<SealedMessage> {
  if (!text.trim() || encoder.encode(text).length > MAX_MESSAGE_BYTES) throw new UserFacingError('runtimeErrors.messageSize');
  if (privateKey.getFingerprint() !== binding.sender_key_fingerprint || senderKey.getFingerprint() !== binding.sender_key_fingerprint ||
      recipientKey.getFingerprint() !== binding.recipient_key_fingerprint) throw new UserFacingError('runtimeErrors.keyChanged');
  const openpgp = await pgp();
  const encrypted = await openpgp.encrypt({
    message: await openpgp.createMessage({ text: JSON.stringify({ schema: 'nolto-private-message/1', ...binding, text }) }),
    encryptionKeys: [senderKey, recipientKey], signingKeys: privateKey, format: 'armored',
    config: { aeadProtect: true, preferredCompressionAlgorithm: openpgp.enums.compression.uncompressed },
  });
  return { ...binding, encryption_version: MESSAGE_ENCRYPTION, encrypted_content: encrypted };
}

export async function openPrivateMessage(message: SealedMessage, privateKey: PrivateKey, senderKey: Key): Promise<string> {
  if (message.encryption_version !== MESSAGE_ENCRYPTION || message.encrypted_content.length > MAX_CIPHERTEXT_BYTES ||
      senderKey.getFingerprint() !== message.sender_key_fingerprint ||
      ![message.sender_key_fingerprint, message.recipient_key_fingerprint].includes(privateKey.getFingerprint())) {
    throw new UserFacingError('runtimeErrors.invalidMessage');
  }
  const openpgp = await pgp();
  const opened = await openpgp.decrypt({
    message: await openpgp.readMessage({ armoredMessage: message.encrypted_content }),
    decryptionKeys: privateKey, verificationKeys: senderKey, expectSigned: true, format: 'utf8',
    config: { maxDecompressedMessageSize: 32768 },
  });
  await Promise.all(opened.signatures.map(signature => signature.verified));
  const payload = JSON.parse(opened.data);
  for (const field of ['id', 'sender_id', 'recipient_id', 'job_conversation_id', 'sender_key_fingerprint', 'recipient_key_fingerprint'] as const) {
    if (payload[field] !== message[field]) throw new UserFacingError('runtimeErrors.wrongConversation');
  }
  if (payload.schema !== 'nolto-private-message/1' || typeof payload.text !== 'string' || encoder.encode(payload.text).length > MAX_MESSAGE_BYTES) {
    throw new UserFacingError('runtimeErrors.invalidMessage');
  }
  return payload.text;
}
