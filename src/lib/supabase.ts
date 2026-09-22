import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: window.location.pathname !== '/auth/social/callback' } },
);
