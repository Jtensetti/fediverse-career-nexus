-- Update the federated_feed view to include Announce type and fix filtering
-- This enables the feed to show boosts/reposts from followed users

CREATE OR REPLACE VIEW public.federated_feed 
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
WHERE ap.type IN ('Note', 'Article', 'Create', 'Announce')
  AND (
    -- For non-Announce posts, exclude replies
    (ap.type != 'Announce' AND ap.content->>'inReplyTo' IS NULL AND ap.content->'object'->>'inReplyTo' IS NULL)
    -- For Announce posts, include all
    OR ap.type = 'Announce'
  )
  AND (ap.content->>'type' IS NULL OR ap.content->>'type' NOT IN ('Like'))
ORDER BY ap.published_at DESC;