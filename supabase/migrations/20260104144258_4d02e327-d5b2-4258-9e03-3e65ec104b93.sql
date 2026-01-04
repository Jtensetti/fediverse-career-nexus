-- Update federated_feed view to exclude replies (posts that are in response to other posts)
DROP VIEW IF EXISTS federated_feed CASCADE;

CREATE VIEW federated_feed AS
SELECT 
  ap.id,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  ap.type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM profiles p WHERE p.id::text = ap.attributed_to::text) THEN 'local'
    ELSE 'remote'
  END AS source
FROM ap_objects ap
WHERE ap.type IN ('Create', 'Note')
  -- Exclude replies: check various places where inReplyTo might be stored
  AND (ap.content->>'inReplyTo' IS NULL)
  AND (ap.content->'object'->>'inReplyTo' IS NULL)
  AND (ap.content->'content'->>'inReplyTo' IS NULL)
ORDER BY ap.published_at DESC;