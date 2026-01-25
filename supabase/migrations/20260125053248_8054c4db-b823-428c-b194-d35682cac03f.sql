-- Add missing columns for job application contact info
ALTER TABLE public.job_posts 
ADD COLUMN IF NOT EXISTS application_url text,
ADD COLUMN IF NOT EXISTS contact_email text;