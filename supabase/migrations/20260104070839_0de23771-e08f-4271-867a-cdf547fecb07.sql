-- Additional tables needed for remaining features
-- =====================================================

-- 1. BLOCKED ACTORS TABLE (for federation moderation)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blocked_actors (
    actor_url TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'blocked',
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.blocked_actors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked actors"
ON public.blocked_actors FOR SELECT
USING (true);

CREATE POLICY "Admins can manage blocked_actors"
ON public.blocked_actors FOR ALL
USING (public.is_admin(auth.uid()));

-- 2. BLOCKED DOMAINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.blocked_domains (
    host TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'blocked',
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocked domains"
ON public.blocked_domains FOR SELECT
USING (true);

CREATE POLICY "Admins can manage blocked_domains"
ON public.blocked_domains FOR ALL
USING (public.is_admin(auth.uid()));

-- 3. ACTIVITIES TABLE (inbound ActivityPub activities)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.actors(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_actor ON public.activities(actor_id);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage activities"
ON public.activities FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view activities for their actors"
ON public.activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = activities.actor_id 
    AND actors.user_id = auth.uid()
  )
);

-- 4. FEDERATION REQUEST LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.federation_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remote_host TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    request_path TEXT,
    user_agent TEXT,
    request_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_federation_request_logs_host_timestamp 
ON public.federation_request_logs(remote_host, timestamp);

ALTER TABLE public.federation_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do all operations on federation_request_logs"
ON public.federation_request_logs
USING (public.is_admin(auth.uid()));

CREATE POLICY "Moderators can view federation_request_logs"
ON public.federation_request_logs
FOR SELECT
USING (public.is_moderator(auth.uid()));

-- 5. AUTH REQUEST LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auth_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_request_logs_ip_timestamp 
ON public.auth_request_logs(ip, timestamp);

-- No RLS needed - service role only access

-- 6. EMAIL VERIFICATION TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user 
ON public.email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token 
ON public.email_verification_tokens(token);

ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can manage own tokens"
ON public.email_verification_tokens
USING (auth.uid() = user_id);

-- 7. REMOTE INSTANCES TABLE (for tracking federated instances)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.remote_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    reason TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_remote_instances_host ON public.remote_instances(host);
CREATE INDEX IF NOT EXISTS idx_remote_instances_status ON public.remote_instances(status);

ALTER TABLE public.remote_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view remote instances"
ON public.remote_instances FOR SELECT
USING (true);

CREATE POLICY "Admins can manage remote instances"
ON public.remote_instances FOR ALL
USING (public.is_admin(auth.uid()));

-- 8. FEDERATION QUEUE STATS VIEW
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_federation_queue_stats()
RETURNS TABLE (
    partition_key INTEGER,
    total_count INTEGER,
    pending_count INTEGER,
    processing_count INTEGER,
    failed_count INTEGER,
    processed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.partition_key,
        COUNT(*)::INTEGER AS total_count,
        COUNT(*) FILTER (WHERE q.status = 'pending')::INTEGER AS pending_count,
        COUNT(*) FILTER (WHERE q.status = 'processing')::INTEGER AS processing_count,
        COUNT(*) FILTER (WHERE q.status = 'failed')::INTEGER AS failed_count,
        COUNT(*) FILTER (WHERE q.status = 'processed')::INTEGER AS processed_count
    FROM federation_queue_partitioned q
    GROUP BY q.partition_key
    ORDER BY q.partition_key;
END;
$$;

CREATE OR REPLACE VIEW public.federation_queue_stats AS
SELECT * FROM public.get_federation_queue_stats();

-- 9. FOLLOWER BATCH STATS VIEW  
-- =====================================================
CREATE OR REPLACE VIEW public.follower_batch_stats AS
SELECT 
    a.id as actor_id,
    a.preferred_username,
    COUNT(fb.id) as total_batches,
    COUNT(fb.id) FILTER (WHERE fb.status = 'pending') as pending_batches,
    COUNT(fb.id) FILTER (WHERE fb.status = 'processed') as processed_batches
FROM public.actors a
LEFT JOIN public.follower_batches fb ON a.id = fb.actor_id
GROUP BY a.id, a.preferred_username;

-- 10. CREATE FOLLOW RPC FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_follow(
    p_local_actor_id UUID,
    p_remote_actor_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_follow_id UUID;
BEGIN
    -- Check if user owns the actor
    IF NOT EXISTS (
        SELECT 1 FROM public.actors 
        WHERE id = p_local_actor_id 
        AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized: You do not own this actor';
    END IF;
    
    -- Insert or update the follow
    INSERT INTO public.outgoing_follows (local_actor_id, remote_actor_url, status)
    VALUES (p_local_actor_id, p_remote_actor_url, 'pending')
    ON CONFLICT (local_actor_id, remote_actor_url) 
    DO UPDATE SET status = 'pending', updated_at = now()
    RETURNING id INTO v_follow_id;
    
    RETURN v_follow_id;
END;
$$;

-- 11. GET RATE LIMITED HOSTS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_rate_limited_hosts(
    window_start TIMESTAMPTZ,
    request_threshold INTEGER
)
RETURNS TABLE (
    remote_host TEXT,
    request_count BIGINT,
    latest_request TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        f.remote_host,
        COUNT(*) as request_count,
        MAX(f.timestamp) as latest_request
    FROM federation_request_logs f
    WHERE f.timestamp >= window_start
    GROUP BY f.remote_host
    HAVING COUNT(*) >= request_threshold
    ORDER BY request_count DESC;
$$;