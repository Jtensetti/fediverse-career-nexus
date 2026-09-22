import { supabase } from '@/integrations/supabase/client';

export interface DeletionReceipt { requested_at: string; purge_after: string }

export async function requestContentDeletion(kind: 'post' | 'article' | 'comment', id: string): Promise<DeletionReceipt> {
  const { data, error } = await supabase.functions.invoke('request-deletion', { body: { kind, id } });
  if (error) {
    const body = error.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
    throw new Error(body?.error || 'Raderingsbegäran kunde inte sparas. Försök igen.');
  }
  if (!data?.purge_after) throw new Error('Raderingsbekräftelse saknas. Försök igen.');
  return data;
}
