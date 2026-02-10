DROP FUNCTION IF EXISTS public.get_post_replies(uuid, integer);

CREATE FUNCTION public.get_post_replies(post_id uuid, max_replies integer DEFAULT 50)
 RETURNS TABLE(id uuid, content jsonb, created_at timestamp with time zone, actor_user_id uuid, actor_username text, company_id uuid)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ao.id,
    ao.content,
    ao.created_at,
    pa.user_id as actor_user_id,
    pa.preferred_username as actor_username,
    ao.company_id
  FROM ap_objects ao
  LEFT JOIN public_actors pa ON ao.attributed_to = pa.id
  WHERE ao.type = 'Note'
    AND (
      ao.content->>'inReplyTo' = post_id::text
      OR ao.content->>'rootPost' = post_id::text
      OR ao.content->'content'->>'inReplyTo' = post_id::text
      OR ao.content->'content'->>'rootPost' = post_id::text
    )
  ORDER BY ao.created_at ASC
  LIMIT max_replies;
END;
$function$