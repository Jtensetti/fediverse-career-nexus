-- Fix 1: Drop overly permissive policy on server_keys
DROP POLICY IF EXISTS "Anyone can view public server keys" ON public.server_keys;

-- Create a view that only exposes public keys (safe for public access)
CREATE OR REPLACE VIEW public.server_public_keys AS
SELECT id, public_key, is_current, created_at
FROM public.server_keys
WHERE is_current = true AND revoked_at IS NULL;

-- Grant access to the safe view
GRANT SELECT ON public.server_public_keys TO anon, authenticated;

-- Create restrictive policy - only service role can access full table
CREATE POLICY "Only service role can access server_keys"
ON public.server_keys FOR SELECT
USING (false);

-- Fix 2: Replace the unsafe get_current_server_key function
-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_current_server_key();

-- Create a safe public key only function for external verification
CREATE OR REPLACE FUNCTION public.get_current_public_key()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT public_key FROM public.server_keys
  WHERE is_current = true AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Fix 3: Check and fix any security definer views
-- The federated views use SECURITY INVOKER by default, but let's explicitly set them

-- Recreate federated_feed view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.federated_feed;
CREATE VIEW public.federated_feed 
WITH (security_invoker = true)
AS
SELECT 
  ap.id,
  ap.type,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  'local' AS source
FROM public.ap_objects ap
WHERE ap.type IN ('Note', 'Article', 'Create')
  AND (ap.content->>'inReplyTo' IS NULL)
  AND (ap.content->'object'->>'inReplyTo' IS NULL)
  AND (ap.content->>'type' IS NULL OR ap.content->>'type' NOT IN ('Like', 'Announce'))
ORDER BY ap.published_at DESC;

-- Recreate federated_posts_with_moderation view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.federated_posts_with_moderation;
CREATE VIEW public.federated_posts_with_moderation
WITH (security_invoker = true)
AS
SELECT 
  ap.id,
  ap.type,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  CASE 
    WHEN ba.actor_url IS NOT NULL THEN 'blocked_actor'
    WHEN bd.host IS NOT NULL THEN 'blocked_domain'
    ELSE 'allowed'
  END AS moderation_status,
  'local' AS source
FROM public.ap_objects ap
LEFT JOIN public.blocked_actors ba ON (
  ap.content->>'attributedTo' = ba.actor_url 
  OR ap.content->'actor'->>'id' = ba.actor_url
)
LEFT JOIN public.blocked_domains bd ON (
  ap.content->>'attributedTo' LIKE '%' || bd.host || '%'
);

-- Recreate federation_queue_stats view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.federation_queue_stats;
CREATE VIEW public.federation_queue_stats
WITH (security_invoker = true)
AS
SELECT 
  partition_key,
  COUNT(*)::INTEGER AS total_count,
  COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_count,
  COUNT(*) FILTER (WHERE status = 'processing')::INTEGER AS processing_count,
  COUNT(*) FILTER (WHERE status = 'failed')::INTEGER AS failed_count,
  COUNT(*) FILTER (WHERE status = 'processed')::INTEGER AS processed_count
FROM public.federation_queue_partitioned
GROUP BY partition_key;

-- Recreate follower_batch_stats view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.follower_batch_stats;
CREATE VIEW public.follower_batch_stats
WITH (security_invoker = true)
AS
SELECT 
  a.id AS actor_id,
  a.preferred_username,
  COUNT(fb.id) AS total_batches,
  COUNT(fb.id) FILTER (WHERE fb.status = 'pending') AS pending_batches,
  COUNT(fb.id) FILTER (WHERE fb.status = 'processed') AS processed_batches
FROM public.actors a
LEFT JOIN public.follower_batches fb ON a.id = fb.actor_id
GROUP BY a.id, a.preferred_username;