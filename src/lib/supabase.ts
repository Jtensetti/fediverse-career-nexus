import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: window.location.pathname !== '/auth/social/callback',
      // Use the SDK's lockless coordination (2.107+). Supplying a custom lock
      // would opt back into the legacy mutex path, even for a no-op callback.
    },
  },
);
