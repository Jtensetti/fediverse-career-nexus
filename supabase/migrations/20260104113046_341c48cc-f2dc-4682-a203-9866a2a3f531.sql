-- Add header image URL to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS header_url text;