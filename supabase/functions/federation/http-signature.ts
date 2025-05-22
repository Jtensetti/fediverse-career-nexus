
// HTTP Signature functions for ActivityPub federation

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.167.0/encoding/base64.ts";

export interface SignatureOptions {
  url: string;
  method: string;
  headers: Headers;
  privateKey: string;
  keyId: string;
}

/**
 * Get the current server key from the database
 */
export async function getServerKey(): Promise<{
  keyId: string;
  privateKey: string;
  publicKey: string;
} | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data, error } = await supabase
      .rpc("get_current_server_key")
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching server key:", error);
      return null;
    }
    
    return {
      keyId: data.key_id,
      privateKey: data.private_key,
      publicKey: data.public_key
    };
  } catch (error) {
    console.error("Error in getServerKey:", error);
    return null;
  }
}

/**
 * Sign an HTTP request for ActivityPub
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
  
  // Prepare the string to sign
  const headersToSign = ['(request-target)', 'host', 'date', 'digest'];
  const headerValues = {
    '(request-target)': `${method.toLowerCase()} ${pathWithQuery}`,
    host: target.host,
    date: date,
    digest: digestHeader
  };
  
  const stringToSign = headersToSign
    .map(header => `${header}: ${headerValues[header as keyof typeof headerValues]}`)
    .join('\n');
  
  // Import the private key
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(privateKey),
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

// Helper function to convert PEM to ArrayBuffer
function pemToBuffer(pem: string): ArrayBuffer {
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
