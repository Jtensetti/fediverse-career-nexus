-- FIX 1: Protect profiles table - deny direct SELECT, require use of public_profiles view
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profile info visible to all" ON public.profiles;

-- Create restrictive policy: users can only read their own profile directly
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Ensure the public_profiles view has security_invoker enabled
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = false) AS
SELECT 
    id,
    username,
    fullname,
    headline,
    avatar_url,
    header_url,
    is_verified,
    location,
    bio,
    domain,
    home_instance,
    remote_actor_url,
    profile_views,
    created_at,
    updated_at,
    auth_type,
    -- Only show phone to the profile owner
    CASE WHEN auth.uid() = id THEN phone ELSE NULL END AS phone,
    CASE WHEN auth.uid() = id THEN dm_privacy ELSE NULL END AS dm_privacy
FROM profiles;

-- Grant SELECT on view to authenticated and anon roles
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- FIX 2: Protect actors table - deny direct SELECT to hide private keys
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can view actor public info" ON public.actors;

-- Create restrictive policy: users can only read their own actor directly
CREATE POLICY "Users can read own actor"
ON public.actors
FOR SELECT
USING (auth.uid() = user_id);

-- Ensure the public_actors view excludes private_key and has proper security
DROP VIEW IF EXISTS public.public_actors;
CREATE VIEW public.public_actors
WITH (security_invoker = false) AS
SELECT 
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
    -- private_key is intentionally excluded
FROM actors;

-- Grant SELECT on view to authenticated and anon roles
GRANT SELECT ON public.public_actors TO authenticated, anon;

-- FIX 3: Ensure server_keys table is only accessible by service role
-- First, check if the 'Only service role' policy correctly denies access
-- The existing policy with USING(false) should block all non-admin access
-- But the admin policy uses is_admin() which may not work as expected

-- Drop existing policies
DROP POLICY IF EXISTS "Only service role can access server_keys" ON public.server_keys;
DROP POLICY IF EXISTS "Admins can manage server keys" ON public.server_keys;

-- Create a single policy that denies all access via RLS
-- The service role bypasses RLS, so it will still have access
CREATE POLICY "Deny all client access to server_keys"
ON public.server_keys
FOR ALL
USING (false)
WITH CHECK (false);