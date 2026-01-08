-- Create smart connection suggestions function
CREATE OR REPLACE FUNCTION get_smart_suggestions(p_user_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE(
  user_id uuid,
  username text,
  fullname text,
  headline text,
  avatar_url text,
  is_verified boolean,
  mutual_count bigint,
  suggestion_reason text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get the current user's direct connections
  my_connections AS (
    SELECT 
      CASE WHEN uc.user_id = p_user_id THEN uc.connected_user_id ELSE uc.user_id END as connected_id
    FROM user_connections uc
    WHERE (uc.user_id = p_user_id OR uc.connected_user_id = p_user_id)
    AND uc.status IN ('accepted', 'pending')
  ),
  -- Get current user's location
  my_location AS (
    SELECT location FROM profiles WHERE id = p_user_id
  ),
  -- Find 2nd degree connections (friends of friends)
  second_degree AS (
    SELECT 
      CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END as potential_id,
      COUNT(*) as mutual
    FROM user_connections uc
    JOIN my_connections mc ON (uc.user_id = mc.connected_id OR uc.connected_user_id = mc.connected_id)
    WHERE uc.status = 'accepted'
    AND CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END != p_user_id
    AND CASE WHEN uc.user_id = mc.connected_id THEN uc.connected_user_id ELSE uc.user_id END NOT IN (SELECT connected_id FROM my_connections)
    GROUP BY potential_id
  ),
  -- Combine suggestions with priority scoring
  suggestions AS (
    SELECT 
      p.id,
      p.username,
      p.fullname,
      p.headline,
      p.avatar_url,
      p.is_verified,
      COALESCE(sd.mutual, 0) as mutual_count,
      CASE 
        WHEN sd.mutual IS NOT NULL AND sd.mutual > 0 THEN 
          sd.mutual::text || ' mutual connection' || CASE WHEN sd.mutual > 1 THEN 's' ELSE '' END
        WHEN p.location IS NOT NULL AND ml.location IS NOT NULL AND p.location ILIKE '%' || split_part(ml.location, ',', 1) || '%' THEN 
          'Also in ' || split_part(p.location, ',', 1)
        ELSE 
          'Suggested for you'
      END as reason,
      -- Priority score: mutual connections weight most, then location match
      CASE 
        WHEN sd.mutual IS NOT NULL THEN 100 + sd.mutual
        WHEN p.location IS NOT NULL AND ml.location IS NOT NULL AND p.location ILIKE '%' || split_part(ml.location, ',', 1) || '%' THEN 50
        ELSE 1
      END as priority
    FROM profiles p
    LEFT JOIN second_degree sd ON p.id = sd.potential_id
    CROSS JOIN my_location ml
    WHERE p.id != p_user_id
    AND p.id NOT IN (SELECT connected_id FROM my_connections)
    AND p.username IS NOT NULL
  )
  SELECT 
    s.id,
    s.username,
    s.fullname,
    s.headline,
    s.avatar_url,
    s.is_verified,
    s.mutual_count,
    s.reason
  FROM suggestions s
  ORDER BY s.priority DESC, s.mutual_count DESC, s.is_verified DESC NULLS LAST
  LIMIT p_limit;
END;
$$;