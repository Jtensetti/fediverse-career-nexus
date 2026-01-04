/**
 * AES-GCM Token Encryption Module
 * Provides secure encryption/decryption for federated session tokens
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 */
function getEncryptionKey(): string {
  const key = Deno.env.get('TOKEN_ENCRYPTION_KEY');
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY is not configured');
  }
  return key;
}

/**
 * Derive a crypto key from the string key
 */
async function deriveKey(keyString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(keyString.padEnd(KEY_LENGTH, '0').slice(0, KEY_LENGTH));
  
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a token using AES-GCM
 * Returns base64-encoded string containing IV + ciphertext
 */
export async function encryptToken(token: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(token)
  );
  
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Base64 encode
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a token that was encrypted with encryptToken
 * Also handles legacy base64-only encryption for backwards compatibility
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0));
    
    // Check if this is a legacy token (starts with 'federated:' after base64 decode)
    const possibleLegacy = new TextDecoder().decode(combined);
    if (possibleLegacy.startsWith('federated:')) {
      console.log('Decrypting legacy token format');
      return possibleLegacy.slice('federated:'.length);
    }
    
    // New format: IV (12 bytes) + ciphertext
    if (combined.length <= IV_LENGTH) {
      throw new Error('Invalid encrypted token format');
    }
    
    const iv = combined.slice(0, IV_LENGTH);
    const ciphertext = combined.slice(IV_LENGTH);
    
    const key = await deriveKey(getEncryptionKey());
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    // Try legacy format as fallback
    try {
      const decoded = atob(encryptedToken);
      if (decoded.startsWith('federated:')) {
        return decoded.slice('federated:'.length);
      }
      return decoded;
    } catch {
      throw new Error('Failed to decrypt token: ' + error.message);
    }
  }
}
