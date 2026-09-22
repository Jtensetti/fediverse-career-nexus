import { OAuthClient, type InternalStateData, type Session, type RuntimeLock } from 'npm:@atproto/oauth-client@0.8.7';
import { JoseKey, type Jwk } from 'npm:@atproto/jwk-jose@0.2.4';
import { serviceClient } from './local-actor.ts';
import { tokenHash } from './oauth.ts';
import { encryptToken, decryptToken } from './token-encryption.ts';
import { atprotoFetch } from './atproto-fetch.ts';
import { atprotoMetadata } from './atproto-policy.ts';
import { getSiteUrl } from './federation-urls.ts';

type Backend = ReturnType<typeof serviceClient>;

export function atprotoLock(db: Backend): RuntimeLock {
  return async (key, action) => {
    const hash = await tokenHash(key);
    const lease = crypto.randomUUID();
    const { data, error } = await db.rpc('claim_atproto_lock', { p_key: hash, p_lease: lease });
    if (error || data !== true) throw new Error('Another sign-in is in progress. Please try again.');
    try { return await action(); }
    finally {
      const { error } = await db.from('atproto_auth_locks').delete().eq('key_hash', hash).eq('lease_id', lease);
      if (error) console.error('Could not release an expiring AT Protocol lock');
    }
  };
}

export async function createAtprotoClient(db: Backend, proof: string, requestFetch = atprotoFetch) {
  const proofHash = await tokenHash(proof);
  let authorizationState: string | undefined;
  // Sign-in needs no ongoing access to Bluesky. Tokens live for this request only.
  const sessions = new Map<string, Session>();
  const client = new OAuthClient({
    clientMetadata: atprotoMetadata(getSiteUrl()),
    responseMode: 'query',
    runtimeImplementation: {
      requestLock: atprotoLock(db),
      createKey: algorithms => JoseKey.generate(algorithms),
      getRandomValues: length => crypto.getRandomValues(new Uint8Array(length)),
      digest: async (data, algorithm) => new Uint8Array(await crypto.subtle.digest(algorithm.name.replace('sha', 'SHA-'), data)),
    },
    // Use the SDK's portable resolver and our restricted HTTPS transport. Importing
    // its Node wrapper loads undici at boot, which the hosted runtime cannot run.
    handleResolver: 'https://bsky.social',
    fetch: requestFetch,
    stateStore: {
      async set(key, { dpopKey, ...state }) {
        authorizationState = key;
        const dpopJwk = dpopKey.privateJwk;
        if (!dpopJwk) throw new Error('Private DPoP key is required');
        const { error } = await db.from('atproto_oauth_states').insert({
          state_hash: await tokenHash(key), browser_proof_hash: proofHash,
          encrypted_state: await encryptToken(JSON.stringify({ ...state, dpopJwk })),
        });
        if (error) throw error;
      },
      async get(key) {
        // DELETE RETURNING is atomic across workers. A wrong browser proof does
        // not consume the real user's state; a replay can never get it twice.
        const { data, error } = await db.from('atproto_oauth_states').delete()
          .eq('state_hash', await tokenHash(key)).eq('browser_proof_hash', proofHash)
          .gt('expires_at', new Date().toISOString()).select('encrypted_state').maybeSingle();
        if (error) throw error;
        if (!data) return undefined;
        const { dpopJwk, ...state } = JSON.parse(await decryptToken(data.encrypted_state)) as Omit<InternalStateData, 'dpopKey'> & { dpopJwk: Jwk };
        return { ...state, dpopKey: await JoseKey.fromJWK(dpopJwk) };
      },
      async del(key) {
        const { error } = await db.from('atproto_oauth_states').delete()
          .eq('state_hash', await tokenHash(key)).eq('browser_proof_hash', proofHash);
        if (error) throw error;
      },
    },
    sessionStore: {
      async set(did, session) { sessions.set(did, session); },
      async get(did) { return sessions.get(did); },
      async del(did) { sessions.delete(did); },
    },
  });
  return { client, getAuthorizationState: () => authorizationState, discardTokens: () => sessions.clear() };
}
