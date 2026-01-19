-- SOLUTION: Use column-level privileges to protect sensitive data
-- This allows SELECT on non-sensitive columns while blocking sensitive ones

-- First, revoke SELECT on the entire actors table from anon and authenticated
REVOKE SELECT ON public.actors FROM anon, authenticated;

-- Grant SELECT only on non-sensitive columns
GRANT SELECT (
    id,
    preferred_username,
    type,
    status,
    follower_count,
    following_count,
    is_remote,
    remote_actor_url,
    remote_inbox_url,
    user_id,
    public_key,
    created_at,
    updated_at
) ON public.actors TO authenticated, anon;

-- private_key column is NOT granted, so it cannot be selected

-- For profiles, revoke and re-grant to exclude sensitive columns
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- Grant SELECT on non-sensitive profile columns
-- Phone is excluded from public access (only via owner check in view)
GRANT SELECT (
    id,
    username,
    fullname,
    headline,
    bio,
    avatar_url,
    header_url,
    location,
    domain,
    is_verified,
    profile_views,
    created_at,
    updated_at,
    auth_type,
    remote_actor_url,
    home_instance
    -- phone, dm_privacy, trust_level, search_vector are NOT granted
) ON public.profiles TO authenticated, anon;

-- Allow authenticated users to see their own sensitive data
-- This is handled by the view's CASE WHEN, but we need to grant SELECT to support it
-- Create a function to check if user is viewing their own profile
CREATE OR REPLACE FUNCTION public.can_view_own_profile_phone(profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = profile_id;
$$;

-- Grant full SELECT to service_role (for edge functions)
GRANT SELECT ON public.actors TO service_role;
GRANT SELECT ON public.profiles TO service_role;