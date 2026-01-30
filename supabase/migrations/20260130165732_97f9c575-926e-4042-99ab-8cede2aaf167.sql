-- =====================================================
-- FIX: Allow profiles table to be read for foreign key joins
-- While the public_profiles view is preferred for direct queries,
-- foreign key joins need access to the base table.
-- The RLS policy allows SELECT but sensitive columns should 
-- only be queried via the view.
-- =====================================================

-- Add policy to allow anyone to read profiles (for joins to work)
-- This is needed because Supabase's foreign key joins query the base table
CREATE POLICY "Anyone can read profiles for joins"
ON public.profiles FOR SELECT
USING (true);

-- Similarly for actors - allow reading public data via joins
CREATE POLICY "Anyone can read public actor data"
ON public.actors FOR SELECT
USING (true);