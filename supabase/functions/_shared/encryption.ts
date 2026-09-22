const encoder = new TextEncoder();
const IV_BYTES = 12;
type Purpose = "message" | "oauth-token" | "retention" | "retained-file";

export function encryptionSecret(): string {
  const secret = Deno.env.get("TOKEN_ENCRYPTION_KEY");
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return secret;
}

async function keyFor(secret: string, purpose: Purpose): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("Encryption keys must contain at least 32 random characters");
  const material = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({
    name: "HKDF", hash: "SHA-256", salt: encoder.encode("nolto:encryption:v2"),
    info: encoder.encode(purpose),
  }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function base64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  }
  return btoa(binary);
}

/** Server-side encryption at rest; the server can decrypt it. This is not E2EE. */
export async function encryptValue(value: string, secret: string, purpose: Purpose): Promise<string> {
  const key = await keyFor(secret, purpose);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({
    name: "AES-GCM", iv, additionalData: encoder.encode(`nolto:${purpose}:v2`),
  }, key, encoder.encode(value));
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return `v2:${base64(combined)}`;
}

export async function decryptValue(value: string, secret: string, purpose: Purpose): Promise<string> {
  const version2 = value.startsWith("v2:");
  const encoded = version2 ? value.slice(3) : value;
  const combined = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  if (combined.length < IV_BYTES + 16) throw new Error("Invalid encrypted value");
  // Read old authenticated AES-GCM data without treating base64 as encryption.
  // Keep the existing secret until old data has been migrated and verified.
  const key = version2 ? await keyFor(secret, purpose) : await crypto.subtle.importKey(
    "raw", encoder.encode(secret.padEnd(32, "0").slice(0, 32)), "AES-GCM", false, ["decrypt"],
  );
  const plaintext = await crypto.subtle.decrypt({
    name: "AES-GCM", iv: combined.slice(0, IV_BYTES),
    ...(version2 ? { additionalData: encoder.encode(`nolto:${purpose}:v2`) } : {}),
  }, key, combined.slice(IV_BYTES));
  return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
}

export async function encryptRetainedFile(value: Uint8Array, secret: string, binding: string): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv,
    additionalData: encoder.encode(`nolto:retained-file:v2:${binding}`),
  }, await keyFor(secret, 'retained-file'), new Uint8Array(value));
  const result = new Uint8Array(4 + IV_BYTES + ciphertext.byteLength);
  result.set([78, 76, 84, 2]); result.set(iv, 4); result.set(new Uint8Array(ciphertext), 4 + IV_BYTES);
  return result;
}

/** Server-only recovery aid. No public or user endpoint exposes retained files. */
export async function decryptRetainedFile(value: Uint8Array, secret: string, binding: string): Promise<Uint8Array> {
  if (value.length < 4 + IV_BYTES + 16 || ![78, 76, 84, 2].every((byte, i) => value[i] === byte)) throw new Error('Invalid retained file');
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(value.slice(4, 4 + IV_BYTES)),
    additionalData: encoder.encode(`nolto:retained-file:v2:${binding}`),
  }, await keyFor(secret, 'retained-file'), new Uint8Array(value.slice(4 + IV_BYTES))));
}
