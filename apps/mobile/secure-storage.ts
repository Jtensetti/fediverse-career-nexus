import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

// Supabase sessions can exceed the per-item Keychain limit. Store small chunks
// behind an atomically replaced manifest; never fall back to plaintext storage.
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const keyFor = (key: string) => `nolto.${key.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
type Manifest = { version: string; count: number };
async function manifest(key: string): Promise<Manifest | null> {
  const value = await SecureStore.getItemAsync(keyFor(key), options);
  if (!value) return null;
  const parsed = JSON.parse(value) as Manifest;
  if (!/^[a-f0-9-]{36}$/.test(parsed.version) || !Number.isInteger(parsed.count) || parsed.count < 1 || parsed.count > 128) throw new Error('Invalid secure session');
  return parsed;
}
async function removeChunks(key: string, value: Manifest | null) {
  if (value) for (let i = 0; i < value.count; i++) await SecureStore.deleteItemAsync(`${keyFor(key)}.${value.version}.${i}`, options);
}
export const secureStorage = {
  async getItem(key: string) {
    const stored = await manifest(key);
    if (!stored) return null;
    let value = '';
    for (let i = 0; i < stored.count; i++) {
      const chunk = await SecureStore.getItemAsync(`${keyFor(key)}.${stored.version}.${i}`, options);
      if (chunk === null) return null;
      value += chunk;
    }
    return value;
  },
  async setItem(key: string, value: string) {
    const previous = await manifest(key);
    const characters = Array.from(value);
    const next = { version: randomUUID(), count: Math.max(1, Math.ceil(characters.length / 400)) };
    if (next.count > 128) throw new Error('Session exceeds secure storage limit');
    try {
      for (let i = 0; i < next.count; i++) await SecureStore.setItemAsync(`${keyFor(key)}.${next.version}.${i}`, characters.slice(i * 400, (i + 1) * 400).join(''), options);
      await SecureStore.setItemAsync(keyFor(key), JSON.stringify(next), options);
    } catch (error) { await removeChunks(key, next); throw error; }
    await removeChunks(key, previous);
  },
  async removeItem(key: string) {
    const previous = await manifest(key);
    await SecureStore.deleteItemAsync(keyFor(key), options);
    await removeChunks(key, previous);
  },
};
