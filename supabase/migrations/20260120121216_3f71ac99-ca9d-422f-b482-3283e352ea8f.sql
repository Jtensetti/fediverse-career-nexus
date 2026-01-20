-- Create password reset codes table
CREATE TABLE public.password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_reset_codes_email_code ON public.password_reset_codes(email, code);
CREATE INDEX idx_reset_codes_expires_at ON public.password_reset_codes(expires_at);

-- Enable RLS
ALTER TABLE public.password_reset_codes ENABLE ROW LEVEL SECURITY;

-- No RLS policies needed - only accessed via service role from edge functions

-- Function to cleanup expired/used codes (called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM public.password_reset_codes 
  WHERE expires_at < now() OR used = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;