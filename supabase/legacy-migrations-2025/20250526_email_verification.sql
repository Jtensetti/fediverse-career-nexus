-- Create table to store email verification tokens
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON public.email_verification_tokens(token);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User can manage own tokens" ON public.email_verification_tokens
  USING (auth.uid() = user_id);
