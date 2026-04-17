-- MFA recovery requests table
CREATE TABLE public.mfa_recovery_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  username TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected')),
  handled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at TIMESTAMPTZ,
  admin_notes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mfa_recovery_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can submit a recovery request — they're locked out by definition
CREATE POLICY "Anyone can submit MFA recovery request"
  ON public.mfa_recovery_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only moderators/admins can read
CREATE POLICY "Moderators can view recovery requests"
  ON public.mfa_recovery_requests
  FOR SELECT
  TO authenticated
  USING (public.is_moderator(auth.uid()));

-- Only moderators/admins can update
CREATE POLICY "Moderators can update recovery requests"
  ON public.mfa_recovery_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_moderator(auth.uid()))
  WITH CHECK (public.is_moderator(auth.uid()));

-- updated_at trigger
CREATE TRIGGER update_mfa_recovery_requests_updated_at
  BEFORE UPDATE ON public.mfa_recovery_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mfa_recovery_requests_status ON public.mfa_recovery_requests(status, created_at DESC);