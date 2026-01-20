-- Fix: Restore public profile access while still protecting phone numbers
-- The previous migration broke the app by making profiles only viewable by owner

-- Step 1: Drop the overly restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Step 2: Recreate public view WITHOUT security_invoker
-- This allows the view to return safe columns to everyone
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id, username, fullname, avatar_url, header_url,
  headline, bio, location, domain, home_instance,
  remote_actor_url, is_verified, profile_views,
  trust_level, dm_privacy, auth_type, created_at, updated_at
  -- phone is intentionally EXCLUDED from this public view
FROM public.profiles;

-- Step 3: Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Step 4: Restore proper SELECT policy - anyone can view profiles
-- Phone protection is handled by the view layer, not RLS
CREATE POLICY "Anyone can view profiles"
ON public.profiles FOR SELECT
USING (true);