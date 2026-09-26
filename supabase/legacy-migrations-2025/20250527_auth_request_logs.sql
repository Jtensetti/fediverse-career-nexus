-- Track auth endpoint requests for rate limiting
CREATE TABLE IF NOT EXISTS public.auth_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_request_logs_ip_timestamp ON public.auth_request_logs(ip, timestamp);
