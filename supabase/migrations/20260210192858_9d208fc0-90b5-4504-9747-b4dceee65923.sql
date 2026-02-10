
-- Drop the redundant owner-only SELECT policy (the broad one covers it)
DROP POLICY "Users can view own section visibility" ON public.profile_section_visibility;

-- Allow anonymous users to read visibility settings (needed to enforce section hiding for non-logged-in visitors)
CREATE POLICY "Anyone can read visibility settings"
  ON public.profile_section_visibility FOR SELECT
  TO anon
  USING (true);
