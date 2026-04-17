-- MFA recovery tokens: signed single-use tokens for password+email verification flow
CREATE TABLE public.mfa_recovery_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.mfa_recovery_requests(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mfa_recovery_tokens_hash ON public.mfa_recovery_tokens(token_hash);
CREATE INDEX idx_mfa_recovery_tokens_user ON public.mfa_recovery_tokens(user_id, created_at DESC);

ALTER TABLE public.mfa_recovery_tokens ENABLE ROW LEVEL SECURITY;

-- No client access; service role only (RLS denies by default)
-- Admins can view audit info
CREATE POLICY "Admins can view recovery tokens"
  ON public.mfa_recovery_tokens FOR SELECT
  USING (public.is_admin(auth.uid()));
