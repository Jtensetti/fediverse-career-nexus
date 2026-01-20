-- Fix 1: Create a secure view for profiles that excludes phone numbers from public access
-- The phone column should only be visible to the profile owner

-- First, drop existing public_profiles view if it exists and recreate without phone
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
  id,
  username,
  fullname,
  avatar_url,
  header_url,
  headline,
  bio,
  location,
  domain,
  home_instance,
  remote_actor_url,
  is_verified,
  profile_views,
  trust_level,
  dm_privacy,
  auth_type,
  created_at,
  updated_at
  -- Explicitly excluding: phone, search_vector
FROM public.profiles;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Update RLS policy on profiles to restrict direct SELECT access
-- Users should only be able to read their own full profile (including phone)
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Only allow users to see their own full profile record
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Create a helper function to check if users are connected (for phone visibility)
CREATE OR REPLACE FUNCTION public.can_view_phone(profile_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.uid() = profile_owner_id 
    OR EXISTS (
      SELECT 1 FROM public.user_connections
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND connected_user_id = profile_owner_id)
        OR (connected_user_id = auth.uid() AND user_id = profile_owner_id)
      )
    )
$$;

-- Fix 2: Prevent tokens from being returned to clients by creating a secure view
-- The federated_sessions table should not expose token columns to client-side queries

-- Create a safe view that excludes encrypted tokens
DROP VIEW IF EXISTS public.federated_sessions_safe;

CREATE VIEW public.federated_sessions_safe
WITH (security_invoker = true) AS
SELECT 
  id,
  profile_id,
  remote_instance,
  remote_actor_url,
  token_expires_at,
  last_verified_at,
  created_at,
  updated_at
  -- Explicitly excluding: access_token_encrypted, refresh_token_encrypted
FROM public.federated_sessions;

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.federated_sessions_safe TO authenticated;

-- Update RLS policy on federated_sessions base table to deny all direct SELECT
-- Tokens should only be accessed server-side via service role
DROP POLICY IF EXISTS "Users can view own federated sessions" ON public.federated_sessions;

-- Deny all direct SELECT access to the base table
-- Edge functions with service role can still access tokens
CREATE POLICY "No direct access to federated sessions tokens"
ON public.federated_sessions FOR SELECT
USING (false);

-- Keep existing INSERT, UPDATE, DELETE policies for user management
-- These allow users to manage their sessions (but not read tokens back)