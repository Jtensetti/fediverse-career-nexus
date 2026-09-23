// This stores only a route back to explicit consent, never credentials or a grant.
export const APP_AUTHORIZATION_RETURN = 'nolto-app-authorization-return';
type ReturnStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const lifetime = 15 * 60 * 1000;

function consentPath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 8192 || !value.startsWith('/oauth/authorize?') || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
  try {
    const url = new URL(value, 'https://nolto.invalid');
    return url.origin === 'https://nolto.invalid' && url.pathname === '/oauth/authorize' && !url.hash;
  } catch { return false; }
}

export function rememberAppAuthorization(path: string, storage: ReturnStorage = sessionStorage, now = Date.now()) {
  if (!consentPath(path)) throw new Error('Invalid app authorization return');
  storage.setItem(APP_AUTHORIZATION_RETURN, JSON.stringify({ path, createdAt: now }));
}

export function consumeAppAuthorization(storage?: ReturnStorage, now = Date.now()): string | null {
  try {
    storage ??= sessionStorage;
    const raw = storage.getItem(APP_AUTHORIZATION_RETURN);
    storage.removeItem(APP_AUTHORIZATION_RETURN);
    const saved = JSON.parse(raw || 'null');
    if (!saved || !consentPath(saved.path) || !Number.isFinite(saved.createdAt) || saved.createdAt > now || now - saved.createdAt > lifetime) return null;
    return saved.path;
  } catch { return null; }
}
