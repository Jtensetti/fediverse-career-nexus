-- Add email_digest_enabled column to profiles table (defaults to true for opt-out model)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_digest_enabled boolean DEFAULT true;