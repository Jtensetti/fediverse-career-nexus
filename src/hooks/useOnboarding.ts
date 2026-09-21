import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useOnboarding = () => {
  const { user, loading } = useAuth();
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  useEffect(() => { setDismissedFor(null); }, [user?.id]);
  const completeOnboarding = async () => {
    if (!user) return;
    const { error } = await supabase.auth.updateUser({ data: { onboarding_completed_at: new Date().toISOString() } });
    if (error) throw error;
    setDismissedFor(user.id);
  };
  return {
    showOnboarding: !loading && !!user && dismissedFor !== user.id && !user.user_metadata?.onboarding_completed_at,
    completeOnboarding,
    hasChecked: !loading,
  };
};
