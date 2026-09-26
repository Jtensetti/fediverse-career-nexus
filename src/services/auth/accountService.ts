import { tx } from '@/i18n/tx';
import { supabase } from "@/lib/supabase";

export const deleteAccount = async (): Promise<{ success: boolean; error?: string; purgeAfter?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST', body: { confirmation: 'RADERA' }
    });

    if (error) {
      const response = error.context instanceof Response ? await error.context.clone().json().catch(() => null) : null;
      return { success: false, error: response?.error === 'recent_login_required'
        ? tx('ui.deleteAccountSection.loggaUtOchLogga')
        : tx('ui.deleteAccountSection.deletionFailed') };
    }

    if (data?.error) {
      return { success: false, error: tx('ui.deleteAccountSection.deletionFailed') };
    }

    // Sign out the user locally after successful deletion
    await supabase.auth.signOut({ scope: 'local' });

    return { success: true, purgeAfter: data.purge_after };
  } catch (error) {
    console.error('Unexpected error deleting account:', error);
    return { success: false, error: tx('ui.deleteAccountSection.deletionFailed') };
  }
};
