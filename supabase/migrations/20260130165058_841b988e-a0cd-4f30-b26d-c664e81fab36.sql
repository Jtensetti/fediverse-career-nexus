-- =====================================================
-- FIX: Allow public access to non-sensitive actor/profile data
-- The views should NOT use security_invoker so they bypass RLS
-- while still hiding sensitive columns (private_key, phone)
-- =====================================================

-- Recreate public_actors view WITHOUT security_invoker
-- This allows anyone to see public actor data while RLS protects the base table
DROP VIEW IF EXISTS public.public_actors;

CREATE VIEW public.public_actors AS
SELECT 
  id,
  user_id,
  preferred_username,
  type,
  status,
  public_key,
  follower_count,
  following_count,
  is_remote,
  remote_actor_url,
  remote_inbox_url,
  also_known_as,
  moved_to,
  created_at,
  updated_at
FROM public.actors;
-- Explicitly excludes: private_key
-- NO security_invoker = view bypasses RLS but hides sensitive columns

-- Grant access to the safe view
GRANT SELECT ON public.public_actors TO authenticated, anon;

-- Recreate public_profiles view WITHOUT security_invoker
-- This allows anyone to see public profile data
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  fullname,
  headline,
  avatar_url,
  location,
  bio,
  is_verified,
  is_freelancer,
  created_at,
  home_instance,
  freelancer_skills,
  freelancer_rate,
  freelancer_availability,
  website,
  CASE WHEN show_email = true THEN public_email ELSE NULL END as contact_email,
  header_url,
  auth_type,
  remote_actor_url
FROM public.profiles;
-- Explicitly excludes: phone, search_vector, domain, dm_privacy, show_email, public_email (raw), trust_level, profile_views, updated_at
-- NO security_invoker = view bypasses RLS but hides sensitive columns

-- Grant access to the safe view  
GRANT SELECT ON public.public_profiles TO authenticated, anon;