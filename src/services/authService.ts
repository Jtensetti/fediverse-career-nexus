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
  const response = await fetch("/functions/v1/auth-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) throw new Error("Login failed");
  const data = await response.json();
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token
  });
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
