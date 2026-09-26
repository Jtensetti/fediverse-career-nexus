
-- Fix the security definer issue by recreating views with explicit SECURITY INVOKER
-- Drop the existing views first
DROP VIEW IF EXISTS public.federated_posts_with_moderation CASCADE;
DROP VIEW IF EXISTS public.federated_feed CASCADE;

-- Recreate federated_feed view with SECURITY INVOKER explicitly set
CREATE VIEW public.federated_feed
WITH (security_invoker=true) AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN p.id IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as source
FROM ap_objects ap
LEFT JOIN profiles p ON ap.attributed_to = p.id
WHERE ap.type = 'Create'
ORDER BY ap.published_at DESC;

-- Recreate federated_posts_with_moderation view with SECURITY INVOKER explicitly set
CREATE VIEW public.federated_posts_with_moderation
WITH (security_invoker=true) AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN p.id IS NOT NULL THEN 'local'
    ELSE 'remote'
  END as source,
  'approved' as moderation_status  -- Default to approved for now
FROM ap_objects ap
LEFT JOIN profiles p ON ap.attributed_to = p.id
WHERE ap.type = 'Create'
ORDER BY ap.published_at DESC;
