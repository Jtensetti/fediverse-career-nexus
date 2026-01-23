-- Fix security definer view issue by recreating with proper permissions
-- Drop and recreate public_profiles view as SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  p.id,
  p.username,
  p.fullname,
  p.headline,
  p.avatar_url,
  p.location,
  p.bio,
  p.home_instance,
  p.is_verified,
  p.is_freelancer,
  p.freelancer_skills,
  p.freelancer_rate,
  p.freelancer_availability,
  p.website,
  CASE WHEN p.show_email = true THEN p.public_email ELSE NULL END as contact_email,
  p.created_at,
  p.header_url,
  p.auth_type,
  p.remote_actor_url
FROM public.profiles p;