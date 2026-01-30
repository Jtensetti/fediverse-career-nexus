-- Table to track when notification digest emails were last sent
CREATE TABLE public.notification_digest_tracking (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_digest_sent_at TIMESTAMPTZ,
  last_notification_check_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_digest_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own tracking record
CREATE POLICY "Users can view own digest tracking"
  ON public.notification_digest_tracking
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (edge function)
CREATE POLICY "Service role can manage digest tracking"
  ON public.notification_digest_tracking
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for efficient querying
CREATE INDEX idx_notification_digest_last_sent ON public.notification_digest_tracking(last_digest_sent_at);