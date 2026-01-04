/**
 * Shared HTTP Signature utilities for ActivityPub federation
 * This module provides signing and verification of HTTP requests
 * following the HTTP Signatures spec for ActivityPub
 */

import { encode as encodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Helper function to convert PEM to ArrayBuffer for private keys
export function pemToPrivateKeyBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  return Uint8Array.from(
    atob(base64)
      .split('')
      .map(c => c.charCodeAt(0))
  );
}

// Helper function to convert PEM to ArrayBuffer for public keys
export function pemToPublicKeyBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  
  return Uint8Array.from(
    atob(base64)
      .split('')
      .map(c => c.charCodeAt(0))
  );
}

/**
 * Generate an RSA key pair for signing
 */
export async function generateRsaKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );

  // Export private key
  const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const privateKeyArray = new Uint8Array(privateKeyBuffer);
  const privateKeyBase64 = btoa(String.fromCharCode(...privateKeyArray));
  const privateKeyPem = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

  // Export public key
  const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  const publicKeyArray = new Uint8Array(publicKeyBuffer);
  const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyArray));
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;

  return {
    privateKey: privateKeyPem,
    publicKey: publicKeyPem
  };
}

/**
 * Sign an HTTP request for ActivityPub with HTTP Signatures
 */
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
  
  // Generate digest of the body
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const digestHeader = `SHA-256=${encodeBase64(hash)}`;
  headers.set('Digest', digestHeader);
  
  // Get the date value if it exists, or set it if it doesn't
  const date = headers.get('Date') || new Date().toUTCString();
  if (!headers.has('Date')) {
    headers.set('Date', date);
  }
  
  // Ensure host header is set
  if (!headers.has('Host')) {
    headers.set('Host', target.host);
  }
  
  // Prepare the string to sign
  const headersToSign = ['(request-target)', 'host', 'date', 'digest'];
  const headerValues: Record<string, string> = {
    '(request-target)': `${method.toLowerCase()} ${pathWithQuery}`,
    host: target.host,
    date: date,
    digest: digestHeader
  };
  
  const stringToSign = headersToSign
    .map(header => `${header}: ${headerValues[header]}`)
    .join('\n');
  
  // Import the private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToPrivateKeyBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  // Sign the string
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(stringToSign)
  );
  
  // Create the signature header
  const signatureHeader = [
    `keyId="${keyId}"`,
    'algorithm="rsa-sha256"',
    `headers="${headersToSign.join(' ')}"`,
    `signature="${encodeBase64(signature)}"`
  ].join(',');
  
  headers.set('Signature', signatureHeader);
}

/**
 * Verify an HTTP signature on an incoming request
 */
export async function verifySignature(
  req: Request,
  body: string,
  getPublicKey: (keyId: string) => Promise<string | null>
): Promise<boolean> {
  const signatureHeader = req.headers.get('Signature');
  const digestHeader = req.headers.get('Digest');
  const dateHeader = req.headers.get('Date');

  if (!signatureHeader || !digestHeader || !dateHeader) {
    console.error('Missing required signature headers');
    return false;
  }

  // Check Date within 5 minutes
  const requestTime = Date.parse(dateHeader);
  if (isNaN(requestTime) || Math.abs(Date.now() - requestTime) > 5 * 60 * 1000) {
    console.error('Date header out of range');
    return false;
  }

  // Verify digest
  const encoder = new TextEncoder();
  const digestBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(body));
  const expectedDigest = 'SHA-256=' + encodeBase64(new Uint8Array(digestBuffer));
  if (expectedDigest !== digestHeader) {
    console.error('Digest mismatch');
    return false;
  }

  // Parse signature header
  const params: Record<string, string> = {};
  for (const part of signatureHeader.split(',')) {
    const [k, v] = part.trim().split('=');
    params[k] = v.replace(/"/g, '');
  }

  const keyId = params['keyId'];
  const signatureB64 = params['signature'];
  const headerNames = (params['headers'] || '').split(' ');

  const url = new URL(req.url);
  const headerValues: Record<string, string> = {
    '(request-target)': `${req.method.toLowerCase()} ${url.pathname}${url.search}`,
    host: url.host,
    date: dateHeader,
    digest: digestHeader,
  };

  const stringToVerify = headerNames
    .map((h) => `${h}: ${headerValues[h] ?? req.headers.get(h)}`)
    .join('\n');

  const publicKeyPem = await getPublicKey(keyId);
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

    const signatureBytes = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    const verified = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureBytes,
      encoder.encode(stringToVerify)
    );
    
    if (!verified) {
      console.error('Signature verification failed');
    }
    return verified;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Ensure an actor has RSA keys, generating them if necessary
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
    
    // Check if actor has keys
    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .select("id, private_key, public_key, preferred_username")
      .eq("id", actorId)
      .single();
    
    if (actorError || !actor) {
      console.error("Error fetching actor:", actorError);
      return null;
    }
    
    // If keys exist, return them
    if (actor.private_key && actor.public_key) {
      const keyId = `${supabaseUrl}/functions/v1/actor/${actor.preferred_username}#main-key`;
      return {
        keyId,
        privateKey: actor.private_key
      };
    }
    
    // Generate new keys
    console.log(`Generating RSA keys for actor ${actor.preferred_username}`);
    const { privateKey, publicKey } = await generateRsaKeyPair();
    
    // Store the keys
    const { error: updateError } = await supabase
      .from("actors")
      .update({
        private_key: privateKey,
        public_key: publicKey
      })
      .eq("id", actorId);
    
    if (updateError) {
      console.error("Error storing generated keys:", updateError);
      return null;
    }
    
    const keyId = `${supabaseUrl}/functions/v1/actor/${actor.preferred_username}#main-key`;
    return {
      keyId,
      privateKey
    };
  } catch (error) {
    console.error("Error in ensureActorHasKeys:", error);
    return null;
  }
}

/**
 * Sign and send an HTTP request for federation
 */
export async function signedFetch(
  url: string,
  options: RequestInit,
  actorId: string
): Promise<Response> {
  const keys = await ensureActorHasKeys(actorId);
  
  if (!keys) {
    throw new Error("Failed to get actor keys for signing");
  }
  
  const headers = new Headers(options.headers);
  
  // Ensure required headers are present
  if (!headers.has("Date")) {
    headers.set("Date", new Date().toUTCString());
  }
  if (!headers.has("Host")) {
    headers.set("Host", new URL(url).host);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/activity+json");
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/activity+json");
  }
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", "ActivityPub-Federation/1.0 (Bondy)");
  }
  
  const body = options.body?.toString() || "";
  
  // Sign the request
  await signRequest(url, options.method || "POST", headers, body, keys.privateKey, keys.keyId);
  
  // Make the signed request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Get public key for a given keyId by fetching the actor profile
 */
export async function fetchPublicKey(keyId: string): Promise<string | null> {
  const actorUrl = keyId.split('#')[0];
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try cache first
    const { data: cached, error } = await supabase
      .from('remote_actors_cache')
      .select('actor_data')
      .eq('actor_url', actorUrl)
      .single();

    if (!error && cached?.actor_data?.publicKey?.publicKeyPem) {
      return cached.actor_data.publicKey.publicKeyPem as string;
    }

    // Fallback to fetch actor profile
    const res = await fetch(actorUrl, {
      headers: { 
        Accept: 'application/activity+json, application/ld+json',
        'User-Agent': 'ActivityPub-Federation/1.0 (Bondy)'
      }
    });
    
    if (!res.ok) return null;
    
    const actorData = await res.json();

    // Cache the fetched actor
    await supabase
      .from('remote_actors_cache')
      .upsert({
        actor_url: actorUrl,
        actor_data: actorData,
        fetched_at: new Date().toISOString()
      });

    return actorData.publicKey?.publicKeyPem || null;
  } catch (_e) {
    console.error('Error fetching public key:', _e);
    return null;
  }
}
