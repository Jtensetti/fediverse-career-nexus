
// HTTP Signature utilities for ActivityPub

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";

/**
 * Get the server key from database
 */
export async function getServerKey(): Promise<{keyId: string, privateKey: string} | null> {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return null;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get the current server key
    const { data, error } = await supabase
      .rpc("get_current_server_key")
      .maybeSingle();
    
    if (error || !data) {
      console.error("Error fetching server key:", error);
      return null;
    }
    
    // Create a full key ID from the base ID
    const domain = new URL(supabaseUrl).hostname;
    const fullKeyId = `${supabaseUrl}/functions/v1/actor/server#${data.key_id}`;
    
    return {
      keyId: fullKeyId,
      privateKey: data.private_key
    };
  } catch (error) {
    console.error("Error in getServerKey:", error);
    return null;
  }
}

// Sign an HTTP request using RSA-SHA256
export async function signRequest(
  url: string,
  method: string,
  headers: Headers,
  body: string,
  privateKey: string,
  keyId: string
): Promise<Headers> {
  const requestTarget = `${method.toLowerCase()} ${new URL(url).pathname}`;
  const digest = await createDigest(body);
  
  headers.set("digest", digest);
  
  // Create signature string
  const signatureString = [
    `(request-target): ${requestTarget}`,
    `host: ${new URL(url).host}`,
    `date: ${headers.get("date")}`,
    `digest: ${digest}`
  ].join("\n");
  
  // Sign the signature string
  const signature = await createSignature(signatureString, privateKey);
  
  // Create the Signature header
  const signatureHeader = [
    `keyId="${keyId}"`,
    `algorithm="rsa-sha256"`,
    `headers="(request-target) host date digest"`,
    `signature="${signature}"`
  ].join(",");
  
  headers.set("signature", signatureHeader);
  
  return headers;
}

// Create a digest of the request body
async function createDigest(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return `SHA-256=${encodeBase64(new Uint8Array(hash))}`;
}

// Create a signature using the private key
async function createSignature(data: string, privateKeyPem: string): Promise<string> {
  try {
    // Convert PEM private key to CryptoKey
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    
    // Extract the base64-encoded part of the PEM
    const pemContents = privateKeyPem
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    
    // Convert base64 to ArrayBuffer
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the key
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256"
      },
      false,
      ["sign"]
    );
    
    // Sign the data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const signatureBuffer = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      dataBuffer
    );
    
    // Return base64-encoded signature
    return encodeBase64(new Uint8Array(signatureBuffer));
  } catch (error) {
    console.error("Error creating signature:", error);
    throw error;
  }
}
