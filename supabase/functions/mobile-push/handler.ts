import { serviceClient, jsonResponse } from '../_shared/local-actor.ts';
import { postHandler, requestBody, requireUser, HttpError, uuid } from '../_shared/user-auth.ts';
import { encryptValue, encryptionSecret } from '../_shared/encryption.ts';
import { validExpoToken } from '../_shared/mobile-push.ts';

export const handler = postHandler(async req => {
  const { user, client, token: sessionToken } = await requireUser(req);
  const body = await requestBody(req, 2048);
  const id = uuid(body.installation_id, 'installation_id');
  const db = serviceClient(10000);
  if (body.action === 'revoke') {
    const { error } = await db.from('mobile_push_devices').delete().eq('id', id).eq('user_id', user.id);
    if (error) throw error;
    return jsonResponse({ enabled: false });
  }
  if (body.action !== 'register' || !validExpoToken(body.token) || !['ios', 'android'].includes(String(body.platform))) throw new HttpError(400, 'Invalid device registration');
  // The token has already been verified by Auth and by the live-session RPC.
  const claims = JSON.parse(atob(sessionToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  const sessionId = uuid(claims.session_id, 'session_id');
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body.token))), byte => byte.toString(16).padStart(2, '0')).join('');
  const { error } = await db.rpc('register_mobile_push', {
    p_id: id, p_user_id: user.id, p_session_id: sessionId, p_platform: body.platform,
    p_hash: hash, p_ciphertext: await encryptValue(body.token, encryptionSecret(), 'push-token'),
  });
  if (error?.code === '42501' || error?.code === '23514') throw new HttpError(409, 'Device registration unavailable');
  if (error) throw error;
  // Recheck after the write in case the session was revoked while encrypting.
  const active = await client.rpc('current_session_is_verified');
  if (active.error || active.data !== true) {
    await db.from('mobile_push_devices').delete().eq('id', id).eq('session_id', sessionId);
    throw new HttpError(401, 'Session is no longer active');
  }
  return jsonResponse({ enabled: true });
});
