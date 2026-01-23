-- Freelancer and Contact Info columns for profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_freelancer BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS freelancer_skills TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS freelancer_rate TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS freelancer_availability TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;

-- Index for freelancer search performance
CREATE INDEX IF NOT EXISTS idx_profiles_freelancer ON public.profiles(is_freelancer) WHERE is_freelancer = true;

-- Index for freelancer skills search using GIN
CREATE INDEX IF NOT EXISTS idx_profiles_freelancer_skills ON public.profiles USING GIN(freelancer_skills) WHERE is_freelancer = true;

-- Update the public_profiles view to include new fields (without email reference)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  fullname,
  headline,
  avatar_url,
  location,
  bio,
  home_instance,
  is_verified,
  is_freelancer,
  freelancer_skills,
  freelancer_rate,
  freelancer_availability,
  website,
  CASE WHEN show_email = true THEN public_email ELSE NULL END as contact_email,
  created_at
FROM public.profiles;