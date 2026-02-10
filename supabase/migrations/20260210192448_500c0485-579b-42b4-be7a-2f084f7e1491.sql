
-- Enum for visibility levels
CREATE TYPE public.section_visibility AS ENUM ('everyone', 'logged_in', 'connections');

-- Table storing per-user, per-section visibility preferences
CREATE TABLE public.profile_section_visibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  section TEXT NOT NULL,
  visibility public.section_visibility NOT NULL DEFAULT 'everyone',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, section)
);

ALTER TABLE public.profile_section_visibility ENABLE ROW LEVEL SECURITY;

-- Owner can read their own settings
CREATE POLICY "Users can view own section visibility"
  ON public.profile_section_visibility FOR SELECT
  USING (auth.uid() = user_id);

-- Owner can upsert their own settings
CREATE POLICY "Users can upsert own section visibility"
  ON public.profile_section_visibility FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own section visibility"
  ON public.profile_section_visibility FOR UPDATE
  USING (auth.uid() = user_id);

-- Anyone logged in can read visibility settings (needed to enforce rules on profile view)
CREATE POLICY "Authenticated users can read all visibility settings"
  ON public.profile_section_visibility FOR SELECT
  TO authenticated
  USING (true);

-- Trigger to update timestamp
CREATE TRIGGER update_profile_section_visibility_updated_at
  BEFORE UPDATE ON public.profile_section_visibility
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
