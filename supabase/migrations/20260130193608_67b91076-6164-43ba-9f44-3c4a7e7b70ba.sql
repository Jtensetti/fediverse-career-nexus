-- Add contact_email column to profiles table
-- This is a user-editable email field separate from auth.users.email
-- Used for notification digest emails and other contact purposes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.profiles.contact_email IS 'User-editable email address for notifications and contact. Separate from auth email.';