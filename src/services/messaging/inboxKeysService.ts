import { UserFacingError } from '@/lib/userFacingError';
import type { PrivateKey } from 'openpgp';
import { supabase } from '@/lib/supabase';
import {
  createInboxKey, unlockInboxKey, readInboxPublicKey, sealPrivateMessage, openPrivateMessage,
  type InboxKeyBackup, type SealedMessage
} from '@/lib/privateMessages';

let unlocked: { userId: string; key: PrivateKey } | null = null;
let revision = 0;
const listeners = new Set<() => void>();
export const subscribeInbox = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const inboxRevision = () => revision;
export const inboxIsUnlocked = (userId: string) => unlocked?.userId === userId;
const notify = () => { revision++; for (const listener of listeners) listener(); };
export function lockInbox() { unlocked = null; notify(); }

async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new UserFacingError('toasts.loginRequiredMessage');
  return data.session.user.id;
}

export async function getInboxBackup(): Promise<InboxKeyBackup | null> {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('message_key_backups').select('encrypted_private_key').eq('user_id', userId).maybeSingle();
  if (error) throw new UserFacingError('runtimeErrors.backupLoad');
  if (!data) return null;
  const publicKey = await getInboxPublicKey(userId, userId);
  if (!publicKey) throw new UserFacingError('runtimeErrors.missingKeyPair');
  return { ...publicKey, encrypted_private_key: data.encrypted_private_key };
}

function checkFingerprint(ownerId: string, userId: string, fingerprint: string) {
  const storageKey = `nolto:message-key:${ownerId}:${userId}`;
  const pinned = localStorage.getItem(storageKey);
  if (pinned && pinned !== fingerprint) throw new UserFacingError('runtimeErrors.keyChanged');
  localStorage.setItem(storageKey, fingerprint);
}

export async function getInboxPublicKey(userId: string, ownerId?: string) {
  const current = ownerId || await currentUserId();
  const { data, error } = await supabase.from('message_public_keys').select('user_id,fingerprint,public_key').eq('user_id', userId).maybeSingle();
  if (error) throw new UserFacingError('runtimeErrors.keyLoad');
  if (!data) return null;
  await readInboxPublicKey(data.public_key, data.fingerprint);
  checkFingerprint(current, userId, data.fingerprint);
  return data;
}

export async function prepareInbox(passphrase: string): Promise<InboxKeyBackup> {
  return createInboxKey(await currentUserId(), passphrase);
}

export async function activateInbox(backup: InboxKeyBackup, passphrase: string) {
  const userId = await currentUserId();
  if (backup.user_id !== userId) throw new UserFacingError('runtimeErrors.wrongKeyAccount');
  const version = revision;
  const key = await unlockInboxKey(backup, passphrase);
  const { data, error } = await supabase.functions.invoke('message-keys', { body: { action: 'register', ...backup } });
  if (error || data?.error) throw new UserFacingError('runtimeErrors.activateKey');
  if (revision !== version || await currentUserId() !== userId) throw new UserFacingError('runtimeErrors.sessionChanged');
  checkFingerprint(userId, userId, backup.fingerprint);
  unlocked = { userId, key }; notify();
}

export async function unlockInbox(passphrase: string) {
  const version = revision;
  const backup = await getInboxBackup();
  if (!backup) throw new UserFacingError('runtimeErrors.activateFirst');
  let key: PrivateKey;
  try { key = await unlockInboxKey(backup, passphrase); }
  catch (error) {
    if (error instanceof UserFacingError) throw error;
    throw new UserFacingError('runtimeErrors.wrongPassphrase');
  }
  if (revision !== version || await currentUserId() !== backup.user_id) throw new UserFacingError('runtimeErrors.sessionChanged');
  unlocked = { userId: backup.user_id, key }; notify();
}

export async function unlockInboxFromBackup(value: unknown, passphrase: string): Promise<InboxKeyBackup> {
  const version = revision;
  const userId = await currentUserId();
  if (!value || typeof value !== 'object') throw new UserFacingError('runtimeErrors.invalidBackup');
  const backup = value as InboxKeyBackup & { schema?: string };
  if (backup.schema !== 'nolto-inbox-key/1' || backup.user_id !== userId ||
      typeof backup.encrypted_private_key !== 'string' || backup.encrypted_private_key.length > 32768) {
    throw new UserFacingError('runtimeErrors.backupAccountFormat');
  }
  const registered = await getInboxPublicKey(userId, userId);
  if (!registered || registered.fingerprint !== backup.fingerprint || registered.public_key !== backup.public_key) {
    throw new UserFacingError('runtimeErrors.backupMismatch');
  }
  const key = await unlockInboxKey(backup, passphrase);
  if (revision !== version || await currentUserId() !== userId) throw new UserFacingError('runtimeErrors.sessionChanged');
  unlocked = { userId, key }; notify();
  return backup;
}

export async function encryptOutgoingMessage(recipientId: string, content: string, jobConversationId: string | null = null): Promise<SealedMessage> {
  const userId = await currentUserId();
  const sessionKey = unlocked;
  if (sessionKey?.userId !== userId) throw new UserFacingError('runtimeErrors.unlockFirst');
  const [sender, recipient] = await Promise.all([getInboxPublicKey(userId, userId), getInboxPublicKey(recipientId, userId)]);
  if (!sender || !recipient) throw new UserFacingError('runtimeErrors.bothActivate');
  return sealPrivateMessage({ id: crypto.randomUUID(), sender_id: userId, recipient_id: recipientId,
    job_conversation_id: jobConversationId, sender_key_fingerprint: sender.fingerprint, recipient_key_fingerprint: recipient.fingerprint },
    content, sessionKey.key, await readInboxPublicKey(sender.public_key, sender.fingerprint), await readInboxPublicKey(recipient.public_key, recipient.fingerprint));
}

export async function decryptIncomingMessage(message: SealedMessage): Promise<string> {
  const userId = await currentUserId();
  const version = revision;
  const sessionKey = unlocked;
  if (sessionKey?.userId !== userId) throw new UserFacingError('runtimeErrors.unlockFirst');
  const sender = await getInboxPublicKey(message.sender_id, userId);
  if (!sender) throw new UserFacingError('runtimeErrors.senderKeyMissing');
  const content = await openPrivateMessage(message, sessionKey.key, await readInboxPublicKey(sender.public_key, sender.fingerprint));
  if (revision !== version) throw new UserFacingError('runtimeErrors.inboxLocked');
  return content;
}

export function downloadInboxBackup(backup: InboxKeyBackup) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ schema: 'nolto-inbox-key/1', ...backup }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'nolto-krypterad-nyckel.json';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
