-- Create a secure view for public profile data that hides sensitive fields
-- This provides field-level security without changing RLS on the profiles table

-- Drop existing view if it exists
DROP VIEW IF EXISTS public.public_profiles;

-- Create secure view that hides phone from public access
-- Phone is only visible to the profile owner
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
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
  -- Phone is only visible to the owner
  CASE 
    WHEN auth.uid() = id THEN phone
    ELSE NULL 
  END as phone,
  -- search_vector hidden from public - only used internally
  CASE 
    WHEN auth.uid() = id THEN search_vector
    ELSE NULL 
  END as search_vector
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add comment explaining the security purpose
COMMENT ON VIEW public.public_profiles IS 'Secure view for public profile access - phone number only visible to profile owner';