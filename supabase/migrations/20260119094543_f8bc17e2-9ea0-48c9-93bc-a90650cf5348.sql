-- Fix the views to use SECURITY INVOKER (not DEFINER) as required
-- SECURITY INVOKER = runs with the permissions of the querying user
-- We need to recreate these views properly

-- Recreate public_profiles with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Recreate public_actors with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_actors;
CREATE VIEW public.public_actors
WITH (security_invoker = true) AS
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

GRANT SELECT ON public.public_actors TO authenticated, anon;