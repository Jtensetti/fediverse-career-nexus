-- The issue: with security_invoker=true, the view respects RLS of base tables
-- But we want the VIEW to be publicly readable while the TABLE is not
-- Solution: Use security_invoker=false (SECURITY DEFINER) for public views
-- but ensure the view excludes sensitive columns

-- For public_profiles: We want public access to non-sensitive columns
-- The view creator's permissions (superuser) will be used, but that's fine
-- because we're controlling WHAT columns are exposed, not WHO can see them
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
    -- Phone and dm_privacy are only visible to the profile owner
    -- But since this is SECURITY DEFINER, we need a different approach
    -- We'll just exclude these sensitive fields entirely from this public view
    NULL::text AS phone,
    NULL::text AS dm_privacy
FROM profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- For public_actors: Expose only public fields, exclude private_key
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
    -- private_key is intentionally excluded - this is the critical security fix
FROM actors;

GRANT SELECT ON public.public_actors TO authenticated, anon;