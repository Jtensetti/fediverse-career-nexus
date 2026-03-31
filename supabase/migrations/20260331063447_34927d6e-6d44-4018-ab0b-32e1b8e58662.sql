
-- Fix: Restrict anonymous SELECT on profile_section_visibility to only 'everyone' rows
DROP POLICY IF EXISTS "Anyone can read visibility settings" ON public.profile_section_visibility;

CREATE POLICY "Anon can read public visibility settings"
  ON public.profile_section_visibility
  FOR SELECT
  TO anon
  USING (visibility = 'everyone');
