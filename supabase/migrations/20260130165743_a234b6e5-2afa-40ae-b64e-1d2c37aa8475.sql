-- =====================================================
-- REVERT: Remove the overly permissive policies that expose sensitive data
-- We'll use a different approach in the application code
-- =====================================================

-- Remove the permissive policies
DROP POLICY IF EXISTS "Anyone can read profiles for joins" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read public actor data" ON public.actors;