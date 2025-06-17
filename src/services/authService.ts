
import { supabase } from "@/integrations/supabase/client";
import { ensureUserProfile } from "./profileService";

export const signUp = async (email: string, password: string) => {
  console.log('SignUp: Starting signup process for:', email);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`
    }
  });

  console.log('SignUp: Response received:', { data, error });

  if (error) {
    console.error('SignUp: Error occurred:', error);
    throw new Error(error.message);
  }

  console.log('SignUp: Success, ensuring profile');

  if (data.user) {
    await ensureUserProfile(data.user.id);
  }

  console.log('SignUp: returning data:', data);
  return data;
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
  console.log('SignIn: Attempting to sign in with:', email);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log('SignIn: Response received:', { 
      user_id: data.user?.id,
      session_exists: !!data.session,
      error 
    });

    if (error) {
      console.error('SignIn: Error occurred:', error);
      throw new Error(error.message);
    }

    if (!data.user || !data.session) {
      console.error('SignIn: No user or session returned');
      throw new Error("No user or session returned from login");
    }

    console.log('SignIn: Success, user authenticated');
    return data.user;
  } catch (error) {
    console.error('SignIn: Unexpected error:', error);
    throw error;
  }
};

export const signOut = async () => {
  console.log('SignOut: Starting signout process');
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('SignOut: Error occurred:', error);
    throw new Error(error.message);
  }
  console.log('SignOut: Success');
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
