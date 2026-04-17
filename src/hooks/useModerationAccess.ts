import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ModerationAccess {
  hasAccess: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  username: string | null;
  loading: boolean;
}

/**
 * Moderation access is governed entirely by the `public.user_roles` table.
 * A user has access if they hold the `admin` or `moderator` role.
 * Manage roles via the Moderator Management UI or directly in the database.
 */
export function useModerationAccess(): ModerationAccess {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['moderation-access', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { hasAccess: false, isAdmin: false, isModerator: false, username: null };
      }

      const [profileResult, adminResult, modResult] = await Promise.all([
        supabase.from('public_profiles').select('username').eq('id', user.id).single(),
        supabase.rpc('is_admin', { _user_id: user.id }),
        supabase.rpc('is_moderator', { _user_id: user.id }),
      ]);

      const isAdmin = adminResult.data === true;
      const isModerator = modResult.data === true;

      return {
        hasAccess: isAdmin || isModerator,
        isAdmin,
        isModerator,
        username: profileResult.data?.username ?? null,
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    hasAccess: data?.hasAccess ?? false,
    isAdmin: data?.isAdmin ?? false,
    isModerator: data?.isModerator ?? false,
    username: data?.username ?? null,
    loading: isLoading,
  };
}
