
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
    console.log('AuthProvider: Setting up auth state management');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('AuthProvider: Error getting initial session:', error);
        } else {
          console.log('AuthProvider: Initial session:', session?.user?.email || 'No session');
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('AuthProvider: Unexpected error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.email || 'No user');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Handle sign in - ensure user has proper setup
        if (event === 'SIGNED_IN' && session?.user) {
          // Use setTimeout to avoid blocking the auth state change
          setTimeout(async () => {
            try {
              console.log('AuthProvider: Setting up user after sign in');
              
              // Check if user has a profile with username
              let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, id')
                .eq('id', session.user.id)
                .single();

              if (profileError && profileError.code !== 'PGRST116') {
                console.error('AuthProvider: Error fetching profile:', profileError);
                return;
              }

              if (!profile) {
                profile = await ensureUserProfile(session.user.id);
                if (!profile) {
                  console.error('AuthProvider: Failed to create profile');
                  return;
                }
              }
              
              // Create default username if none exists
              if (profile && !profile.username) {
                console.log('AuthProvider: Creating default username');
                const defaultUsername = `user_${session.user.id.slice(0, 8)}`;
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ username: defaultUsername })
                  .eq('id', session.user.id);
                
                if (updateError) {
                  console.error('AuthProvider: Error updating username:', updateError);
                  return;
                }
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
                console.log('AuthProvider: Creating actor for user');
                try {
                  await createUserActor(session.user.id);
                  console.log('AuthProvider: Actor created successfully');
                } catch (error) {
                  console.error('AuthProvider: Error creating actor:', error);
                }
              } else {
                console.log('AuthProvider: User already has actor');
              }
            } catch (error) {
              console.error('AuthProvider: Error in user setup:', error);
            }
          }, 100);
        }
      }
    );

    // Get initial session
    getInitialSession();

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    console.log('AuthProvider: Signing out user');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('AuthProvider: Error signing out:', error);
        throw error;
      }
      console.log('AuthProvider: Sign out successful');
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
