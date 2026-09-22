import { remoteUrl } from './remote-fetch.ts';

export const ATPROTO_SCOPE = 'atproto';

export function atprotoHandle(input: unknown): string {
  if (typeof input !== 'string') throw new Error('Enter a Bluesky handle');
  const handle = input.trim().replace(/^@/, '').toLowerCase();
  if (handle.length > 253 || handle.split('.').some(label => label.length > 63) || !/[a-z]/.test(handle.split('.').at(-1) || '') || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(handle)) {
    throw new Error('Enter a complete handle, such as name.bsky.social');
  }
  remoteUrl(`https://${handle}`);
  return handle;
}

export function browserProof(input: unknown): string {
  if (typeof input !== 'string' || !/^[a-f0-9]{64}$/.test(input)) throw new Error('Invalid browser proof');
  return input;
}

export function atprotoMetadata(site: string) {
  const origin = remoteUrl(site).origin;
  if (site !== origin) throw new Error('SITE_URL must be a canonical HTTPS origin');
  return {
    client_id: `${origin}/oauth-client-metadata.json` as `https://${string}`,
    client_name: 'Nolto', client_uri: origin as `https://${string}`,
    tos_uri: `${origin}/terms` as `https://${string}`, policy_uri: `${origin}/privacy` as `https://${string}`,
    redirect_uris: [`${origin}/auth/atproto/callback`] as [`https://${string}`],
    application_type: 'web' as const,
    token_endpoint_auth_method: 'none' as const,
    grant_types: ['authorization_code'] as ['authorization_code'],
    response_types: ['code'] as ['code'],
    scope: ATPROTO_SCOPE, dpop_bound_access_tokens: true,
  };
}

export function atprotoCallbackParams(input: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of ['state', 'code', 'iss']) {
    const value = input[key];
    if (typeof value !== 'string' || !value.length || value.length > 2048) throw new Error('Invalid callback');
    params.set(key, value);
  }
  const issuer = remoteUrl(params.get('iss')!);
  if (issuer.origin !== params.get('iss')) throw new Error('Invalid issuer origin');
  return params;
}
