import { readKey, readPrivateKey } from 'npm:openpgp@6.3.1';
import { serviceClient, jsonResponse } from '../_shared/local-actor.ts';
import { postHandler, requestBody, requireUser, HttpError } from '../_shared/user-auth.ts';

Deno.serve(postHandler(async req => {
  const { user } = await requireUser(req);
  const body = await requestBody(req, 65536);
  if (body.action !== 'register' || body.user_id !== user.id || 'passphrase' in body) throw new HttpError(400, 'Invalid key registration');
  const { public_key, encrypted_private_key, fingerprint } = body;
  if (typeof public_key !== 'string' || public_key.length > 16384 || typeof encrypted_private_key !== 'string' ||
      encrypted_private_key.length > 32768 || typeof fingerprint !== 'string') throw new HttpError(400, 'Invalid keys');
  try {
    const publicKey = await readKey({ armoredKey: public_key });
    const privateKey = await readPrivateKey({ armoredKey: encrypted_private_key });
    if (publicKey.isPrivate() || publicKey.getFingerprint() !== fingerprint || privateKey.getFingerprint() !== fingerprint ||
        privateKey.getKeys().some(key => 'isDecrypted' in key.keyPacket && key.keyPacket.isDecrypted()) ||
        publicKey.armor() !== privateKey.toPublic().armor() ||
        publicKey.getUserIDs().length !== 1 || publicKey.getUserIDs()[0] !== `Nolto ${user.id}`) throw new Error('Invalid key pair');
    await publicKey.getEncryptionKey();
    await publicKey.getSigningKey();
  } catch { throw new HttpError(400, 'An encrypted private key and its matching public key are required'); }
  const { error } = await serviceClient().rpc('register_message_keys', {
    p_user_id: user.id, p_public_key: public_key, p_private_key: encrypted_private_key, p_fingerprint: fingerprint,
  });
  if (error?.code === '23505') throw new HttpError(409, 'A message key is already registered. Unlock the existing key.');
  if (error) throw error;
  return jsonResponse({ success: true }, 201);
}));
