import { UserFacingError } from '@/lib/userFacingError';
import { supabase } from '@/lib/supabase';

export interface DeletionReceipt { requested_at: string; purge_after: string }

export async function requestContentDeletion(kind: 'post' | 'article' | 'comment', id: string): Promise<DeletionReceipt> {
  const { data, error } = await supabase.functions.invoke('request-deletion', { body: { kind, id } });
  if (error) {
    throw new UserFacingError('runtimeErrors.deletionConfirmation');
  }
  if (!data?.purge_after) throw new UserFacingError('runtimeErrors.deletionConfirmation');
  return data;
}
