-- Create efficient RPC function for batch boost counts
CREATE OR REPLACE FUNCTION get_batch_boost_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid, boost_count bigint) AS $$
  SELECT 
    (content->'object'->>'id')::uuid as post_id,
    COUNT(*) as boost_count
  FROM ap_objects
  WHERE type = 'Announce'
    AND (content->'object'->>'id')::uuid = ANY(post_ids)
  GROUP BY (content->'object'->>'id')::uuid
$$ LANGUAGE sql STABLE;

-- Create efficient RPC function for batch reply counts
CREATE OR REPLACE FUNCTION get_batch_reply_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid, reply_count bigint) AS $$
  SELECT 
    COALESCE(
      (content->>'rootPost')::uuid,
      (content->>'inReplyTo')::uuid
    ) as post_id,
    COUNT(*) as reply_count
  FROM ap_objects
  WHERE type = 'Note'
    AND content->>'inReplyTo' IS NOT NULL
    AND (
      (content->>'rootPost')::uuid = ANY(post_ids)
      OR (content->>'inReplyTo')::uuid = ANY(post_ids)
    )
  GROUP BY COALESCE(
    (content->>'rootPost')::uuid,
    (content->>'inReplyTo')::uuid
  )
$$ LANGUAGE sql STABLE;