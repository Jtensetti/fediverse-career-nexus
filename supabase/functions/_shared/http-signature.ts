/**
 * Shared HTTP Signature utilities for ActivityPub federation
 *
 * Centralised signing + verification used by every federation function.
 * - Uses canonical samverkan.se URLs for keyId (never SUPABASE_URL).
 * - Key generation uses the SQL function `ensure_actor_keys` for race safety.
 * - Signature parser handles base64 padding (`=`) in the signature value.
 * - Includes replay protection via `federation_signature_cache`.
 */

import { encode as encodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildKeyId } from "./federation-urls.ts";

// ---------- PEM helpers ----------

export function pemToPrivateKeyBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  return Uint8Array.from(atob(base64).split('').map(c => c.charCodeAt(0)));
}

export function pemToPublicKeyBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  return Uint8Array.from(atob(base64).split('').map(c => c.charCodeAt(0)));
}

// ---------- Key generation ----------

export async function generateRsaKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"]
  );
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)));
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  return { privateKey: privateKeyPem, publicKey: publicKeyPem };
}

// ---------- Signing ----------

export async function signRequest(
  url: string,
  method: string,
  headers: Headers,
  body: string,
  privateKey: string,
  keyId: string
): Promise<void> {
  const target = new URL(url);
  const pathWithQuery = target.pathname + target.search;

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const digestHeader = `SHA-256=${encodeBase64(hash)}`;
  headers.set('Digest', digestHeader);

  const date = headers.get('Date') || new Date().toUTCString();
  if (!headers.has('Date')) headers.set('Date', date);
  if (!headers.has('Host')) headers.set('Host', target.host);

  const headersToSign = ['(request-target)', 'host', 'date', 'digest'];
  const headerValues: Record<string, string> = {
    '(request-target)': `${method.toLowerCase()} ${pathWithQuery}`,
    host: target.host,
    date,
    digest: digestHeader,
  };

  const stringToSign = headersToSign.map(h => `${h}: ${headerValues[h]}`).join('\n');

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPrivateKeyBuffer(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(stringToSign));

  const signatureHeader = [
    `keyId="${keyId}"`,
    'algorithm="rsa-sha256"',
    `headers="${headersToSign.join(' ')}"`,
    `signature="${encodeBase64(signature)}"`,
  ].join(',');

  headers.set('Signature', signatureHeader);
}

// ---------- Signature parsing (handles base64 `=` padding) ----------

/**
 * Parse an HTTP Signature header into key/value pairs.
 * Splits on the FIRST `=` only — signature values contain base64 `=` padding,
 * so a naive `split('=')` corrupts the value.
 */
export function parseSignatureHeader(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const part of header.split(',')) {
    const trimmed = part.trim();
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const k = trimmed.substring(0, eqIdx).trim();
    let v = trimmed.substring(eqIdx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    params[k] = v;
  }
  return params;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- Verification ----------

export interface VerifyResult {
  ok: true;
  keyId: string;
  keyIdHost: string;
}

export interface VerifyOptions {
  /** Provide a custom public-key resolver. Defaults to fetchPublicKey. */
  getPublicKey?: (keyId: string) => Promise<string | null>;
  /** Skip the replay-cache check (e.g. in tests). Default: false. */
  skipReplayCache?: boolean;
}

/**
 * Verify an inbound HTTP-signed ActivityPub request.
 * Enforces: Date window (±5 min), digest match, signature validity, replay protection.
 * Caller must additionally check that `keyIdHost` matches the activity's actor host.
 */
export async function verifyRequestSignature(
  req: Request,
  body: string,
  opts: VerifyOptions = {}
): Promise<VerifyResult | false> {
  const signatureHeader = req.headers.get('Signature');
  const digestHeader = req.headers.get('Digest');
  const dateHeader = req.headers.get('Date');

  if (!signatureHeader || !digestHeader || !dateHeader) {
    console.error('Missing required signature headers');
    return false;
  }

  const requestTime = Date.parse(dateHeader);
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) {
    console.error('Date header out of range');
    return false;
  }

  const encoder = new TextEncoder();
  const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const expectedDigest = 'SHA-256=' + encodeBase64(new Uint8Array(digestBuffer));
  if (expectedDigest !== digestHeader) {
    console.error('Digest mismatch');
    return false;
  }

  const params = parseSignatureHeader(signatureHeader);
  const keyId = params['keyId'];
  const signatureB64 = params['signature'];
  const headerNames = (params['headers'] || '(request-target) host date digest').split(' ');

  if (!keyId || !signatureB64) {
    console.error('Signature header missing keyId or signature');
    return false;
  }

  // Replay protection
  if (!opts.skipReplayCache) {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const sigHash = await sha256Hex(signatureB64);
        const { data: seen } = await supabase
          .from('federation_signature_cache')
          .select('signature_hash')
          .eq('signature_hash', sigHash)
          .maybeSingle();
        if (seen) {
          console.error('Replay detected for signature');
          return false;
        }
        await supabase.from('federation_signature_cache').insert({ signature_hash: sigHash }).then(() => {}, () => {});
      }
    } catch (e) {
      console.error('Replay-cache check failed (continuing):', e);
    }
  }

  const url = new URL(req.url);
  const headerValues: Record<string, string> = {
    '(request-target)': `${req.method.toLowerCase()} ${url.pathname}${url.search}`,
    host: url.host,
    date: dateHeader,
    digest: digestHeader,
  };
  const stringToVerify = headerNames.map(h => `${h}: ${headerValues[h] ?? req.headers.get(h)}`).join('\n');

  const resolver = opts.getPublicKey ?? fetchPublicKey;
  const publicKeyPem = await resolver(keyId);
  if (!publicKeyPem) {
    console.error('Unable to retrieve public key for', keyId);
    return false;
  }

  try {
    const cryptoKey = await crypto.subtle.importKey(
      'spki',
      pemToPublicKeyBuffer(publicKeyPem),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const signatureBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const verified = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signatureBytes, encoder.encode(stringToVerify));
    if (!verified) {
      console.error('Signature verification failed');
      return false;
    }
    return { ok: true, keyId, keyIdHost: new URL(keyId).hostname };
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/** @deprecated Use verifyRequestSignature. Retained for legacy callers. */
export async function verifySignature(
  req: Request,
  body: string,
  getPublicKey: (keyId: string) => Promise<string | null>
): Promise<boolean> {
  const result = await verifyRequestSignature(req, body, { getPublicKey });
  return !!result;
}

// ---------- Atomic key resolution ----------

/**
 * Ensure an actor has RSA keys. Race-safe: relies on the SQL `ensure_actor_keys`
 * function which takes an advisory lock per actor UUID, so concurrent callers
 * always converge on the same keypair.
 */
export async function ensureActorHasKeys(actorId: string): Promise<{
  keyId: string;
  privateKey: string;
} | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables");
      return null;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id, private_key, public_key, preferred_username")
      .eq("id", actorId)
      .single();

    if (actorError || !actor) {
      console.error("Error fetching actor:", actorError);
      return null;
    }

    let privateKey = actor.private_key;
    if (!privateKey || !actor.public_key) {
      // Generate locally, then commit through the race-safe RPC. If another
      // request won the race, the RPC returns the existing keys instead.
      const fresh = await generateRsaKeyPair();
      const { data: ensured, error: ensureErr } = await supabase.rpc("ensure_actor_keys", {
        actor_uuid: actorId,
        new_private_key: fresh.privateKey,
        new_public_key: fresh.publicKey,
      });
      if (ensureErr || !ensured?.[0]) {
        console.error("ensure_actor_keys failed:", ensureErr);
        return null;
      }
      privateKey = ensured[0].private_key;
    }

    // Canonical keyId — never leak SUPABASE_URL into outgoing payloads.
    return { keyId: buildKeyId(actor.preferred_username), privateKey: privateKey! };
  } catch (error) {
    console.error("Error in ensureActorHasKeys:", error);
    return null;
  }
}

// ---------- Signed fetch ----------

export async function signedFetch(
  url: string,
  options: RequestInit,
  actorId: string
): Promise<Response> {
  const keys = await ensureActorHasKeys(actorId);
  if (!keys) throw new Error("Failed to get actor keys for signing");

  const headers = new Headers(options.headers);
  if (!headers.has("Date")) headers.set("Date", new Date().toUTCString());
  if (!headers.has("Host")) headers.set("Host", new URL(url).host);
  if (!headers.has("Content-Type")) headers.set("Content-Type", 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"');
  if (!headers.has("Accept")) headers.set("Accept", "application/activity+json");
  if (!headers.has("User-Agent")) headers.set("User-Agent", "ActivityPub-Federation/1.0 (Samverkan)");

  const body = options.body?.toString() || "";
  await signRequest(url, options.method || "POST", headers, body, keys.privateKey, keys.keyId);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    return await fetch(url, { ...options, headers, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ---------- Public-key resolution ----------

export async function fetchPublicKey(keyId: string): Promise<string | null> {
  const actorUrl = keyId.split('#')[0];
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return null;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: cached, error } = await supabase
      .from('remote_actors_cache')
      .select('actor_data')
      .eq('actor_url', actorUrl)
      .single();

    if (!error && cached?.actor_data?.publicKey?.publicKeyPem) {
      return cached.actor_data.publicKey.publicKeyPem as string;
    }

    const res = await fetch(actorUrl, {
      headers: {
        Accept: 'application/activity+json, application/ld+json',
        'User-Agent': 'ActivityPub-Federation/1.0 (Samverkan)',
      },
    });
    if (!res.ok) return null;
    const actorData = await res.json();

    await supabase.from('remote_actors_cache').upsert({
      actor_url: actorUrl,
      actor_data: actorData,
      fetched_at: new Date().toISOString(),
    });

    return actorData.publicKey?.publicKeyPem || null;
  } catch (e) {
    console.error('Error fetching public key:', e);
    return null;
  }
}
