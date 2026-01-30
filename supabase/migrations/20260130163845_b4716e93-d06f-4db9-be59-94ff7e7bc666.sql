-- =====================================================
-- FIX 1: Protect private keys in actors table
-- =====================================================

-- Drop the current overly permissive SELECT policy
DROP POLICY IF EXISTS "Public can read actors" ON public.actors;

-- Drop existing view first to avoid column mismatch
DROP VIEW IF EXISTS public.public_actors;

-- Create a view that excludes private keys for public access
CREATE VIEW public.public_actors
WITH (security_invoker=on) AS
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

-- Grant access to the safe view
GRANT SELECT ON public.public_actors TO authenticated, anon;

-- Create restrictive RLS policy for base table
-- Users can only access their own full actor data (including private_key)
CREATE POLICY "Users can view own actor with private key"
ON public.actors FOR SELECT
USING (auth.uid() = user_id);

-- =====================================================
-- FIX 2: Protect sensitive fields in profiles table  
-- =====================================================

-- Drop overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can read profiles" ON public.profiles;

-- Create policy: users can see their own full profile (including phone)
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Note: The phone/email field protection is enforced by:
-- 1. The public_profiles view that excludes phone (already exists)
-- 2. Application code uses public_profiles view for other users' data
-- 3. The can_view_phone() function for connection-based phone visibility
-- 4. RLS now only allows users to see their own full profile