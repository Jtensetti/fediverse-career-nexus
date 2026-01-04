-- Phase 2 & 3 & 4 & 7: Scaling Improvements

-- 2.1 Extend remote_actors_cache with hit tracking for adaptive TTL
ALTER TABLE public.remote_actors_cache 
ADD COLUMN IF NOT EXISTS hit_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT now();

-- Update cache TTL on access (7 days for frequently accessed actors)
CREATE OR REPLACE FUNCTION public.update_cache_on_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.expires_at = now() + interval '7 days';
  NEW.hit_count = COALESCE(OLD.hit_count, 0) + 1;
  NEW.last_accessed_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_cache_ttl ON public.remote_actors_cache;
CREATE TRIGGER update_cache_ttl
BEFORE UPDATE ON public.remote_actors_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_cache_on_access();

-- 3.2 Instance health scoring for rate limiting
ALTER TABLE public.remote_instances 
ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS request_count_24h INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS error_count_24h INTEGER DEFAULT 0;

-- 4.2 Add indexes for better query performance (non-concurrent)
CREATE INDEX IF NOT EXISTS idx_ap_objects_feed 
ON public.ap_objects (published_at DESC, type);

CREATE INDEX IF NOT EXISTS idx_federation_queue_processing 
ON public.federation_queue_partitioned (partition_key, status, created_at);

CREATE INDEX IF NOT EXISTS idx_remote_cache_active 
ON public.remote_actors_cache (actor_url, expires_at);

CREATE INDEX IF NOT EXISTS idx_federation_request_logs_host_time
ON public.federation_request_logs (remote_host, timestamp DESC);

-- 7.2 Create alerts table for monitoring
CREATE TABLE IF NOT EXISTS public.federation_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on federation_alerts
ALTER TABLE public.federation_alerts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage alerts
DROP POLICY IF EXISTS "Admins can manage federation_alerts" ON public.federation_alerts;
CREATE POLICY "Admins can manage federation_alerts" 
ON public.federation_alerts 
FOR ALL 
USING (is_admin(auth.uid()));

-- Moderators can view alerts
DROP POLICY IF EXISTS "Moderators can view federation_alerts" ON public.federation_alerts;
CREATE POLICY "Moderators can view federation_alerts"
ON public.federation_alerts
FOR SELECT
USING (is_moderator(auth.uid()));

-- Function to create alerts
CREATE OR REPLACE FUNCTION public.create_federation_alert(
  p_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
  INSERT INTO public.federation_alerts (alert_type, severity, message, metadata)
  VALUES (p_type, p_severity, p_message, p_metadata)
  RETURNING id;
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- 3.1 Function to check rate limiting per host
CREATE OR REPLACE FUNCTION public.check_host_rate_limit(
  p_remote_host TEXT,
  p_max_requests_per_minute INTEGER DEFAULT 100
) RETURNS BOOLEAN AS $$
DECLARE
  request_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO request_count
  FROM public.federation_request_logs
  WHERE remote_host = p_remote_host
    AND timestamp > now() - interval '1 minute';
  
  RETURN request_count < p_max_requests_per_minute;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update instance health based on errors
CREATE OR REPLACE FUNCTION public.update_instance_health(
  p_host TEXT,
  p_success BOOLEAN
) RETURNS void AS $$
BEGIN
  INSERT INTO public.remote_instances (host, health_score, request_count_24h, error_count_24h, last_seen_at)
  VALUES (p_host, CASE WHEN p_success THEN 100 ELSE 90 END, 1, CASE WHEN p_success THEN 0 ELSE 1 END, now())
  ON CONFLICT (host) DO UPDATE SET
    health_score = CASE 
      WHEN p_success THEN LEAST(remote_instances.health_score + 1, 100)
      ELSE GREATEST(remote_instances.health_score - 5, 0)
    END,
    request_count_24h = remote_instances.request_count_24h + 1,
    error_count_24h = CASE 
      WHEN p_success THEN remote_instances.error_count_24h 
      ELSE remote_instances.error_count_24h + 1 
    END,
    last_error_at = CASE WHEN p_success THEN remote_instances.last_error_at ELSE now() END,
    last_seen_at = now(),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6.2 Add priority to federation queue
ALTER TABLE public.federation_queue_partitioned 
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ DEFAULT now();

-- Index for priority-based processing
CREATE INDEX IF NOT EXISTS idx_federation_queue_priority 
ON public.federation_queue_partitioned (partition_key, priority DESC, created_at);

-- Function to get queue health metrics
CREATE OR REPLACE FUNCTION public.get_federation_health()
RETURNS TABLE(
  total_pending BIGINT,
  total_processing BIGINT,
  total_failed BIGINT,
  oldest_pending_age_minutes DOUBLE PRECISION,
  avg_processing_time_ms DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE status = 'processing') as total_processing,
    COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
    EXTRACT(EPOCH FROM (now() - MIN(created_at) FILTER (WHERE status = 'pending'))) / 60 as oldest_pending_age_minutes,
    0.0::DOUBLE PRECISION as avg_processing_time_ms
  FROM public.federation_queue_partitioned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;