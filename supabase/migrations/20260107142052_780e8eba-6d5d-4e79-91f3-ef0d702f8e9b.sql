-- Add missing company_domain column to experiences table
ALTER TABLE public.experiences ADD COLUMN IF NOT EXISTS company_domain text;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS experiences_user_id_idx ON public.experiences(user_id);
CREATE INDEX IF NOT EXISTS education_user_id_idx ON public.education(user_id);
CREATE INDEX IF NOT EXISTS skills_user_id_idx ON public.skills(user_id);