import { supabase } from "@/integrations/supabase/client";
import { ensureUserProfile } from "./profileService";

const isDev = import.meta.env.DEV;

export const signUp = async (email: string, password: string) => {
  if (isDev) console.log('SignUp: Starting signup process');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  if (error) {
    if (isDev) console.error('SignUp: Error occurred:', error.message);
    throw new Error(error.message);
  }

  if (data.user) {
    await ensureUserProfile(data.user.id);
  }

  return data;
};

export const confirmEmail = async (token: string) => {
  const response = await supabase.functions.invoke('auth-confirm-email', {
    body: { token }
  });
  
  if (response.error) throw new Error("Confirmation failed");
  return response.data;
};

export const signIn = async (email: string, password: string) => {
  if (isDev) console.log('SignIn: Attempting to sign in');
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (isDev) console.error('SignIn: Error occurred:', error.message);
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      throw new Error("No user or session returned from login");
    }

    if (isDev) console.log('SignIn: Success');
    return data.user;
  } catch (error) {
    if (isDev) console.error('SignIn: Unexpected error:', error);
    throw error;
  }
};

export const signOut = async () => {
  if (isDev) console.log('SignOut: Starting signout process');
  const { error } = await supabase.auth.signOut();
  if (error) {
    if (isDev) console.error('SignOut: Error occurred:', error.message);
    throw new Error(error.message);
  }
  if (isDev) console.log('SignOut: Success');
};

export const fetchMe = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  
  const { data, error } = await supabase.functions.invoke('me');
  
  if (error) return null;
  return data;
};
