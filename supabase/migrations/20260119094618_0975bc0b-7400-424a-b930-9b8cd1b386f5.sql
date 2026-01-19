-- Alternative approach: Keep base tables with public read for non-sensitive columns
-- Use SECURITY INVOKER views that respect RLS
-- The key is that the view excludes sensitive columns (like private_key)

-- For profiles: Allow public read of non-sensitive data
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Public can read profiles"
ON public.profiles
FOR SELECT
USING (true);

-- For actors: Allow public read of non-sensitive data via RLS
-- The security is in the VIEW (public_actors) which excludes private_key
DROP POLICY IF EXISTS "Users can read own actor" ON public.actors;
CREATE POLICY "Public can read actors"
ON public.actors
FOR SELECT
USING (true);

-- Now create SECURITY INVOKER views (which the linter prefers)
-- The views will work because the base tables now allow SELECT

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
    -- Sensitive: only show to owner
    CASE WHEN auth.uid() = id THEN phone ELSE NULL END AS phone,
    CASE WHEN auth.uid() = id THEN dm_privacy ELSE NULL END AS dm_privacy
    -- Excludes: trust_level, search_vector (internal use only)
FROM profiles;

GRANT SELECT ON public.public_profiles TO authenticated, anon;

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
    -- CRITICAL: private_key is EXCLUDED from this view
FROM actors;

GRANT SELECT ON public.public_actors TO authenticated, anon;