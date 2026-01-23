-- Add source column to track follow origin
ALTER TABLE author_follows 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Add comment for documentation
COMMENT ON COLUMN author_follows.source IS 'Origin of follow: manual, connection, onboarding';

-- Create the onboarding recommendations RPC function
CREATE OR REPLACE FUNCTION get_onboarding_recommendations(
  p_user_id UUID,
  p_headline TEXT DEFAULT '',
  p_role TEXT DEFAULT '',
  p_interests TEXT[] DEFAULT '{}',
  p_limit INT DEFAULT 12
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  fullname TEXT,
  headline TEXT,
  avatar_url TEXT,
  match_score INT,
  match_reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id as user_id,
    p.username,
    p.fullname,
    p.headline,
    p.avatar_url,
    (
      CASE WHEN p.headline ILIKE '%' || p_role || '%' THEN 10 ELSE 0 END +
      CASE WHEN array_length(p_interests, 1) > 0 AND p.headline ILIKE ANY(
        ARRAY(SELECT '%' || unnest || '%' FROM unnest(p_interests))
      ) THEN 5 ELSE 0 END
    )::INT as match_score,
    CASE 
      WHEN p.headline ILIKE '%' || p_role || '%' THEN 'Works in similar role'
      ELSE 'Recommended for you'
    END as match_reason
  FROM profiles p
  WHERE p.id != p_user_id
    AND p.fullname IS NOT NULL
    AND (
      p.headline ILIKE '%' || p_role || '%'
      OR (array_length(p_interests, 1) > 0 AND p.headline ILIKE ANY(
        ARRAY(SELECT '%' || unnest || '%' FROM unnest(p_interests))
      ))
      OR (p_headline IS NOT NULL AND p_headline != '' AND p.headline ILIKE '%' || p_headline || '%')
    )
  ORDER BY p.id, 
    CASE WHEN p.headline ILIKE '%' || p_role || '%' THEN 10 ELSE 0 END DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing connections as mutual follows (both directions)
INSERT INTO author_follows (follower_id, author_id, source)
SELECT uc.user_id, uc.connected_user_id, 'connection'
FROM user_connections uc
WHERE uc.status = 'accepted'
ON CONFLICT (follower_id, author_id) DO UPDATE SET source = 'connection';

INSERT INTO author_follows (follower_id, author_id, source)
SELECT uc.connected_user_id, uc.user_id, 'connection'
FROM user_connections uc
WHERE uc.status = 'accepted'
ON CONFLICT (follower_id, author_id) DO UPDATE SET source = 'connection';