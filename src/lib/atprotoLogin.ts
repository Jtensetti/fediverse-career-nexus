export const ATPROTO_LOGIN_STORAGE = 'nolto_atproto_login';

export function readAtprotoLogin(serialized: string | null, state: string | null, now = Date.now()): { proof: string; state: string; createdAt: number; link: boolean } {
  const stored = JSON.parse(serialized || 'null');
  if (!stored || typeof stored.proof !== 'string' || !/^[a-f0-9]{64}$/.test(stored.proof)
    || typeof state !== 'string' || !state || stored.state !== state
    || !Number.isFinite(stored.createdAt) || stored.createdAt > now || now - stored.createdAt > 600000
    || typeof stored.link !== 'boolean') throw new Error('Invalid or expired sign-in');
  return stored;
}

export function clearAtprotoLogin() {
  try { sessionStorage.removeItem(ATPROTO_LOGIN_STORAGE); } catch { /* Storage may be disabled by the browser. */ }
}
