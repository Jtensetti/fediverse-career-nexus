import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Only these usernames can access moderation features
const ALLOWED_MODERATORS = ['jtensetti_mastodon'];

interface ModerationAccess {
  hasAccess: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  username: string | null;
  loading: boolean;
}

export function useModerationAccess(): ModerationAccess {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['moderation-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return { hasAccess: false, isAdmin: false, isModerator: false, username: null };
      
      // Get user profile
      const { data: profile } = await supabase
        .from('public_profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      const username = profile?.username || null;
      
      // Check if user is in allowed list
      const hasAccess = username ? ALLOWED_MODERATORS.includes(username) : false;
      
      // Also check roles from database for future extensibility
      const [adminResult, modResult] = await Promise.all([
        supabase.rpc('is_admin', { _user_id: user.id }),
        supabase.rpc('is_moderator', { _user_id: user.id })
      ]);
      
      return {
        hasAccess,
        isAdmin: adminResult.data === true,
        isModerator: modResult.data === true,
        username
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
  
  return {
    hasAccess: data?.hasAccess ?? false,
    isAdmin: data?.isAdmin ?? false,
    isModerator: data?.isModerator ?? false,
    username: data?.username ?? null,
    loading: isLoading,
  };
}
