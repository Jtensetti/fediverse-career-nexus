-- Create a secure function to create mutual follows when a connection is accepted
CREATE OR REPLACE FUNCTION public.create_mutual_connection_follows(
  user_a UUID,
  user_b UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is one of the users
  IF auth.uid() NOT IN (user_a, user_b) THEN
    RAISE EXCEPTION 'Unauthorized: caller must be one of the users';
  END IF;
  
  -- Verify an accepted connection exists between the users
  IF NOT EXISTS (
    SELECT 1 FROM user_connections
    WHERE status = 'accepted'
    AND (
      (user_id = user_a AND connected_user_id = user_b) OR
      (user_id = user_b AND connected_user_id = user_a)
    )
  ) THEN
    RAISE EXCEPTION 'No accepted connection found between users';
  END IF;
  
  -- Create mutual follows with source='connection'
  INSERT INTO author_follows (follower_id, author_id, source)
  VALUES 
    (user_a, user_b, 'connection'),
    (user_b, user_a, 'connection')
  ON CONFLICT (follower_id, author_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- Backfill missing connection-based follows for existing accepted connections
INSERT INTO author_follows (follower_id, author_id, source)
SELECT 
  uc.user_id,
  uc.connected_user_id,
  'connection'
FROM user_connections uc
WHERE uc.status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM author_follows af
  WHERE af.follower_id = uc.user_id
  AND af.author_id = uc.connected_user_id
)
ON CONFLICT (follower_id, author_id) DO NOTHING;

INSERT INTO author_follows (follower_id, author_id, source)
SELECT 
  uc.connected_user_id,
  uc.user_id,
  'connection'
FROM user_connections uc
WHERE uc.status = 'accepted'
AND NOT EXISTS (
  SELECT 1 FROM author_follows af
  WHERE af.follower_id = uc.connected_user_id
  AND af.author_id = uc.user_id
)
ON CONFLICT (follower_id, author_id) DO NOTHING;