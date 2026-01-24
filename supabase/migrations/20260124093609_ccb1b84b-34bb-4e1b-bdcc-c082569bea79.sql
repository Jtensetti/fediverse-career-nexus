-- Drop and recreate the federated_feed view with proper source detection
CREATE OR REPLACE VIEW public.federated_feed 
WITH (security_invoker = true)
AS
SELECT 
  ap.id,
  ap.type,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  CASE 
    WHEN act.is_remote = true THEN 'remote'::text
    ELSE 'local'::text
  END AS source
FROM public.ap_objects ap
LEFT JOIN public.actors act ON ap.attributed_to = act.id
WHERE ap.type IN ('Note', 'Article', 'Create', 'Announce')
  AND (
    -- For non-Announce posts, exclude replies
    (ap.type != 'Announce' AND ap.content->>'inReplyTo' IS NULL AND (ap.content->'object'->>'inReplyTo') IS NULL)
    -- For Announce posts, include all
    OR ap.type = 'Announce'
  )
  AND (ap.content->>'type' IS NULL OR ap.content->>'type' NOT IN ('Like'))
ORDER BY ap.published_at DESC;