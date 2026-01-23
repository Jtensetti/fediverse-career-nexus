/**
 * AES-GCM Message Encryption Module
 * Provides secure encryption/decryption for direct messages
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // 96 bits for GCM
const KEY_LENGTH = 32; // 256 bits

/**
 * Get the encryption key from environment
 * Uses TOKEN_ENCRYPTION_KEY for consistency with existing infrastructure
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
 * Encrypt a message using AES-GCM
 * Returns base64-encoded string containing IV + ciphertext
 */
export async function encryptMessage(content: string): Promise<string> {
  const key = await deriveKey(getEncryptionKey());
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encoder.encode(content)
  );
  
  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  // Base64 encode
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a message that was encrypted with encryptMessage
 */
export async function decryptMessage(encryptedContent: string): Promise<string> {
  try {
    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedContent), c => c.charCodeAt(0));
    
    // Check if content is long enough
    if (combined.length <= IV_LENGTH) {
      throw new Error('Invalid encrypted message format');
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
    console.error('Failed to decrypt message:', error);
    throw new Error('Failed to decrypt message');
  }
}
