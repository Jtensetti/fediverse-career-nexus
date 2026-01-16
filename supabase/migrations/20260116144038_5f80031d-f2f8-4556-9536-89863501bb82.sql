-- Create RPC function to properly query replies by JSON fields
CREATE OR REPLACE FUNCTION public.get_post_replies(post_id uuid, max_replies int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  content jsonb,
  created_at timestamptz,
  actor_user_id uuid,
  actor_username text
) 
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ao.id,
    ao.content,
    ao.created_at,
    a.user_id as actor_user_id,
    a.preferred_username as actor_username
  FROM ap_objects ao
  LEFT JOIN actors a ON ao.attributed_to = a.id
  WHERE ao.type = 'Note'
    AND (
      ao.content->>'inReplyTo' = post_id::text
      OR ao.content->>'rootPost' = post_id::text
    )
  ORDER BY ao.created_at ASC
  LIMIT max_replies;
END;
$$;