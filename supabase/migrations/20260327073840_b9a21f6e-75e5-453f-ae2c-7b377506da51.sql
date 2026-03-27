
-- Recreate public_profiles view without contact_email and with SECURITY INVOKER
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles
WITH (security_invoker = true)
AS SELECT
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
  header_url,
  auth_type,
  remote_actor_url
FROM profiles;
