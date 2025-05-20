
// HTTP Signature utilities for ActivityPub

import { createHash } from "https://deno.land/std@0.177.0/node/crypto.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.177.0/encoding/base64.ts";

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
  const hash = createHash("sha256");
  hash.update(body);
  const digest = hash.digest();
  return `SHA-256=${encodeBase64(digest)}`;
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

// Generate a new RSA key pair for ActivityPub
export async function generateRsaKeyPair(): Promise<{ publicKey: string, privateKey: string }> {
  // Generate RSA-2048 key pair
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
      hash: "SHA-256"
    },
    true,
    ["sign", "verify"]
  );
  
  // Export keys to PKCS8 and SPKI formats
  const privateKeyExport = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
  const publicKeyExport = await crypto.subtle.exportKey("spki", keyPair.publicKey);
  
  // Convert to base64 PEM format
  const privateKeyBase64 = encodeBase64(new Uint8Array(privateKeyExport));
  const publicKeyBase64 = encodeBase64(new Uint8Array(publicKeyExport));
  
  const privateKeyPem = [
    "-----BEGIN PRIVATE KEY-----",
    ...privateKeyBase64.match(/.{1,64}/g) || [],
    "-----END PRIVATE KEY-----"
  ].join("\n");
  
  const publicKeyPem = [
    "-----BEGIN PUBLIC KEY-----",
    ...publicKeyBase64.match(/.{1,64}/g) || [],
    "-----END PUBLIC KEY-----"
  ].join("\n");
  
  return { publicKey: publicKeyPem, privateKey: privateKeyPem };
}
