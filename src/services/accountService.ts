import { supabase } from "@/integrations/supabase/client";

export const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST'
    });
    
    if (error) {
      console.error('Delete account error:', error);
      return { success: false, error: error.message };
    }
    
    if (data?.error) {
      return { success: false, error: data.error };
    }
    
    // Sign out the user locally after successful deletion
    await supabase.auth.signOut();
    
    return { success: true };
  } catch (error) {
    console.error('Unexpected error deleting account:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};
