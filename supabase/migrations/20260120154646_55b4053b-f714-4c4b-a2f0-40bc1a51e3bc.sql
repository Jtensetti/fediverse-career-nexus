-- Fix: Grant SELECT permission on profiles table
-- The table-level GRANT was missing after the security migration
-- This caused "permission denied for table profiles" errors

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;