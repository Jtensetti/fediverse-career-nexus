import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { backend, configured } from './config';
import { secureStorage } from './secure-storage';

export const client = configured ? createClient(backend.url, backend.publishableKey, {
  auth: { ...(Platform.OS !== 'web' ? { storage: secureStorage } : {}), autoRefreshToken: true, persistSession: Platform.OS !== 'web', detectSessionInUrl: false, lock: processLock },
}) : null;

export async function pushApi<T>(body: Record<string, unknown>): Promise<T> {
  if (!client) throw new Error('Appen är inte konfigurerad.');
  const { data, error } = await client.functions.invoke('mobile-push', { body });
  if (error) throw new Error('Kunde inte ansluta. Kontrollera uppkopplingen och försök igen.');
  return data as T;
}
