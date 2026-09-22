export const SOCIAL_LOGIN_STORAGE = 'nolto-social-login';

export function readSocialLogin(raw: string | null, flow: string | null, hash: string, now = Date.now()) {
  if (!raw || !flow) throw new Error('Sign-in state missing');
  const saved = JSON.parse(raw) as { flow?: string; createdAt?: number };
  if (!/^[a-f0-9]{64}$/.test(flow) || saved.flow !== flow || typeof saved.createdAt !== 'number' || now < saved.createdAt || now - saved.createdAt > 15 * 60 * 1000) throw new Error('Sign-in state expired or mismatched');
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token'), refresh_token = params.get('refresh_token');
  if (params.has('error') || !access_token || !refresh_token || access_token.length > 16384 || refresh_token.length > 16384 || params.getAll('access_token').length !== 1 || params.getAll('refresh_token').length !== 1) throw new Error('Sign-in failed');
  return { access_token, refresh_token };
}
