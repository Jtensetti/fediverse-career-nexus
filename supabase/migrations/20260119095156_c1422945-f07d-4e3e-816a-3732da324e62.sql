-- Fix user search by adding search_vector to public_profiles view
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS 
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
  search_vector,
  CASE WHEN public.can_view_own_profile_phone(id) THEN phone ELSE NULL::text END AS phone,
  CASE WHEN public.can_view_own_profile_phone(id) THEN dm_privacy ELSE NULL::text END AS dm_privacy
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;