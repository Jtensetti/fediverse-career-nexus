ALTER TABLE public.mfa_recovery_requests
  ADD COLUMN IF NOT EXISTS attempted_login_email text;