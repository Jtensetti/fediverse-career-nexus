
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createUserActor } from '@/services/actorService';
import { ensureUserProfile } from '@/services/profileService';
import { needsMFAVerification } from '@/services/mfaService';
import MFAVerifyDialog from '@/components/MFAVerifyDialog';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  /** True if user is authenticated but needs MFA verification */
  mfaPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Background user setup - non-blocking
const setupUserInBackground = async (userId: string) => {
  const cacheKey = `user_setup_${userId}`;
  const cachedSetup = localStorage.getItem(cacheKey);
  
  // Cache valid for 5 minutes
  if (cachedSetup) {
    try {
      const cached = JSON.parse(cachedSetup);
      if (Date.now() - cached.timestamp < 300000) {
        return; // Cache hit - skip setup
      }
    } catch {
      // Invalid cache, continue with setup
    }
  }
  
  try {
    // Run profile and actor checks in PARALLEL
    const [profile, existingActor] = await Promise.all([
      ensureUserProfile(userId),
      supabase.from('public_actors').select('id').eq('user_id', userId).maybeSingle()
    ]);
    
    if (!profile) {
      console.error('AuthProvider: Failed to create/ensure profile');
      return;
    }
    
    // Create actor if needed
    if (!existingActor.data && !existingActor.error) {
      try {
        await createUserActor(userId);
      } catch (error) {
        console.error('AuthProvider: Error creating actor:', error);
      }
    }
    
    // Update cache
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now() }));
  } catch (error) {
    console.error('AuthProvider: Error in user setup:', error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaDialogOpen, setMfaDialogOpen] = useState(false);

  // Check MFA requirement whenever session changes
  const checkMFARequirement = async () => {
    if (!session?.user) {
      setMfaPending(false);
      setMfaFactorId(null);
      return;
    }
    
    try {
      const mfaCheck = await needsMFAVerification();
      console.log('AuthProvider: MFA check result:', mfaCheck);
      
      if (mfaCheck.needed && mfaCheck.factorId) {
        setMfaPending(true);
        setMfaFactorId(mfaCheck.factorId);
        setMfaDialogOpen(true);
      } else {
        setMfaPending(false);
        setMfaFactorId(null);
        setMfaDialogOpen(false);
      }
    } catch (error) {
      console.error('AuthProvider: Error checking MFA:', error);
      setMfaPending(false);
    }
  };

  useEffect(() => {
    let loadingTimeoutId: NodeJS.Timeout;
    
    // Timeout to prevent indefinite loading state
    loadingTimeoutId = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.warn('AuthProvider: Loading timeout reached, forcing completion');
          return false;
        }
        return prev;
      });
    }, 10000);
    
    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('AuthProvider: Error getting initial session:', error);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('AuthProvider: Unexpected error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle sign in - run setup in background (non-blocking)
        if (event === 'SIGNED_IN' && session?.user) {
          // Fire and forget - don't block the UI
          void setupUserInBackground(session.user.id);
        }
        
        // Clear cache on sign out
        if (event === 'SIGNED_OUT') {
          setMfaPending(false);
          setMfaFactorId(null);
          setMfaDialogOpen(false);
          // Clear all user setup caches
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('user_setup_')) {
              localStorage.removeItem(key);
            }
          });
        }
      }
    );
    
    // Clear timeout on cleanup
    return () => {
      clearTimeout(loadingTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Check MFA whenever session changes
  useEffect(() => {
    if (session?.user && !loading) {
      checkMFARequirement();
    }
  }, [session?.user?.id, loading]);

  const handleMFASuccess = () => {
    setMfaPending(false);
    setMfaFactorId(null);
    setMfaDialogOpen(false);
  };

  const handleMFACancel = async () => {
    // Sign out since they cancelled MFA verification
    await supabase.auth.signOut();
    setMfaPending(false);
    setMfaFactorId(null);
    setMfaDialogOpen(false);
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthProvider: Error signing out:', error);
        throw error;
      }
    } catch (error) {
      console.error('AuthProvider: Sign out failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    mfaPending,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Global MFA verification dialog */}
      {mfaFactorId && (
        <MFAVerifyDialog
          open={mfaDialogOpen}
          onOpenChange={setMfaDialogOpen}
          factorId={mfaFactorId}
          onSuccess={handleMFASuccess}
          onCancel={handleMFACancel}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
