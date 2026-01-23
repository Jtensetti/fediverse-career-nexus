-- Fix conflicting RLS policies on actors table
-- Remove the old restrictive policy that conflicts with the public read policy

DROP POLICY IF EXISTS "Actors public data viewable, private keys protected" ON public.actors;

-- Ensure the public read policy exists and is correct
DROP POLICY IF EXISTS "Public can read actors" ON public.actors;
CREATE POLICY "Public can read actors"
ON public.actors
FOR SELECT
USING (true);

-- Ensure grants are correct
GRANT SELECT ON public.actors TO authenticated, anon;
GRANT SELECT ON public.public_actors TO authenticated, anon;