
import { supabase } from "@/integrations/supabase/client";

export const signUp = async (email: string, password: string) => {
  const response = await fetch("/functions/v1/auth-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error("Signup failed");
  return response.json();
};

export const confirmEmail = async (token: string) => {
  const response = await fetch("/functions/v1/auth-confirm-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token })
  });
  if (!response.ok) throw new Error("Confirmation failed");
  return response.json();
};

export const signIn = async (email: string, password: string) => {
  try {
    const response = await fetch("/functions/v1/auth-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      const data = await response.json();
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      });
      
      // Ensure user has proper profile and actor setup
      await ensureUserSetup(data.user);
      
      return data.user;
    }
  } catch (_err) {
    // fall back to direct auth below
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error || !data.session) {
    throw new Error(error?.message ?? "Login failed");
  }
  
  // Ensure user has proper profile and actor setup
  await ensureUserSetup(data.user);
  
  return data.user;
};

export const fetchMe = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const response = await fetch("/functions/v1/me", {
    headers: { Authorization: `Bearer ${session.access_token}` }
  });
  if (!response.ok) return null;
  return response.json();
};

// Helper function to ensure user has proper setup
const ensureUserSetup = async (user: any) => {
  if (!user?.id) return;
  
  try {
    // Check if user has a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .single();
    
    // If no profile exists, it should be created by the trigger
    // But we can verify the username constraint is working
    if (profile && !profile.username) {
      console.log('User profile exists but needs username setup');
    }
    
    // Check if user has user_settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .single();
    
    // Create user_settings if they don't exist
    if (!settings) {
      await supabase
        .from('user_settings')
        .insert({ user_id: user.id });
    }
    
    // Check if user has an actor record with keys
    const { data: actor } = await supabase
      .from('actors')
      .select('id, private_key, public_key')
      .eq('user_id', user.id)
      .single();
    
    if (actor && (!actor.private_key || !actor.public_key)) {
      // Actor exists but needs keys - this should be handled by the edge function
      console.log('Actor needs key generation');
    }
    
  } catch (error) {
    console.error('Error ensuring user setup:', error);
  }
};
