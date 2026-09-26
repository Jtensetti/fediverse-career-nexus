
-- Create a table to track federation API requests for rate limiting
CREATE TABLE IF NOT EXISTS public.federation_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  remote_host TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_path TEXT,
  user_agent TEXT,
  request_id TEXT
);

-- Create index on host and timestamp for efficient queries
CREATE INDEX IF NOT EXISTS idx_federation_request_logs_host_timestamp 
ON public.federation_request_logs (remote_host, timestamp);

-- Add RLS policy to restrict access to admins and moderators
ALTER TABLE public.federation_request_logs ENABLE ROW LEVEL SECURITY;

-- Create policy that allows admins to do all operations
CREATE POLICY "Admins can do all operations on federation_request_logs" 
  ON public.federation_request_logs 
  USING (is_admin(auth.uid()));

-- Create policy that allows moderators to select from the table
CREATE POLICY "Moderators can view federation_request_logs" 
  ON public.federation_request_logs 
  FOR SELECT
  USING (is_moderator(auth.uid()));

-- Create a function to get rate limited hosts
CREATE OR REPLACE FUNCTION public.get_rate_limited_hosts(
  window_start TIMESTAMPTZ,
  request_threshold INTEGER
)
RETURNS TABLE (
  remote_host TEXT,
  request_count BIGINT,
  latest_request TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    remote_host, 
    COUNT(*) as request_count, 
    MAX(timestamp) as latest_request
  FROM 
    federation_request_logs
  WHERE 
    timestamp >= window_start
  GROUP BY 
    remote_host
  HAVING 
    COUNT(*) >= request_threshold
  ORDER BY 
    request_count DESC;
$$;

-- Comment on the function
COMMENT ON FUNCTION public.get_rate_limited_hosts IS 'Returns hosts that have exceeded a specified request threshold within a time window';
