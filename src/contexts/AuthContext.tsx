
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createUserActor } from '@/services/actorService';
import { ensureUserProfile } from '@/services/profileService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle sign in - ensure user has proper setup
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            try {
              // Setting up user after sign in
              
              // Ensure profile exists first
              const profile = await ensureUserProfile(session.user.id);
              if (!profile) {
                console.error('AuthProvider: Failed to create/ensure profile');
                return;
              }
              
              // Check if user has an actor
              const { data: existingActor, error: actorError } = await supabase
                .from('actors')
                .select('id')
                .eq('user_id', session.user.id)
                .single();
              
              if (actorError && actorError.code !== 'PGRST116') {
                console.error('AuthProvider: Error checking for actor:', actorError);
                return;
              }
              
              if (!existingActor) {
                try {
                  await createUserActor(session.user.id);
                } catch (error) {
                  console.error('AuthProvider: Error creating actor:', error);
                }
              }
            } catch (error) {
              console.error('AuthProvider: Error in user setup:', error);
            }
          }, 100);
        }
      }
    );

    // THEN check for existing session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('AuthProvider: Error getting initial session:', error);
        } else {
          // Initial session loaded
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

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
