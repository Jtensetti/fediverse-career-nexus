BEGIN;

-- A recipient can answer an invitation, not create one or move it to another event.
DROP POLICY "Event owners can manage invitations" ON public.event_invitations;
CREATE POLICY "Event owners read invitations" ON public.event_invitations FOR SELECT TO authenticated
  USING ((SELECT auth.uid())=public.get_event_owner(event_id));
CREATE POLICY "Event owners send invitations" ON public.event_invitations FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid())=public.get_event_owner(event_id) AND status='pending');
CREATE POLICY "Event owners revoke invitations" ON public.event_invitations FOR DELETE TO authenticated
  USING ((SELECT auth.uid())=public.get_event_owner(event_id));
REVOKE ALL ON public.event_invitations FROM PUBLIC,anon;
REVOKE UPDATE ON public.event_invitations FROM authenticated;
GRANT UPDATE(status) ON public.event_invitations TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_owner(p_event_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT user_id FROM public.events WHERE id=p_event_id
    AND public.privacy_account_is_active(user_id)
    AND ((SELECT auth.role())='service_role' OR
      (user_id=(SELECT auth.uid()) AND public.current_session_is_verified()));
$$;
CREATE OR REPLACE FUNCTION public.is_user_invited_to_event(p_event_id uuid,p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT ((SELECT auth.role())='service_role' OR
      (p_user_id=(SELECT auth.uid()) AND public.current_session_is_verified()))
    AND EXISTS(SELECT 1 FROM public.event_invitations WHERE event_id=p_event_id AND user_id=p_user_id);
$$;
CREATE OR REPLACE FUNCTION public.is_user_blocked(checker_id uuid,target_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT ((SELECT auth.role())='service_role' OR
      ((SELECT auth.uid()) IN(checker_id,target_id) AND public.current_session_is_verified()))
    AND EXISTS(SELECT 1 FROM public.user_blocks WHERE blocker_id=checker_id AND blocked_user_id=target_id);
$$;

-- Local messaging only needs the existing public profile projection. It already
-- hides deleted accounts and excludes private CV, contact and key fields.
CREATE OR REPLACE FUNCTION public.get_participant_info(participant_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT coalesce((SELECT jsonb_build_object('id',id,'username',username,'fullname',fullname,
    'avatar_url',avatar_url,'is_federated',coalesce(auth_type='federated',false),
    'home_instance',home_instance,'found',true)
    FROM public.public_profiles WHERE id=participant_id),'{"found":false}'::jsonb);
$$;
REVOKE ALL ON FUNCTION public.get_participant_info(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_participant_info(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.has_user_voted(poll_uuid uuid,check_user_id uuid)
RETURNS TABLE(option_index integer) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT pv.option_index FROM public.poll_votes pv WHERE pv.poll_id=poll_uuid AND pv.user_id=check_user_id
    AND public.privacy_object_is_active(pv.poll_id);
$$;
REVOKE ALL ON FUNCTION public.has_user_voted(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_user_voted(uuid,uuid) TO authenticated,service_role;

-- This helper is called only by the routines below. It reproduces the public
-- audience/owner boundary while those routines aggregate votes across users.
CREATE FUNCTION public.readable_poll(p_poll_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END
  FROM public.ap_objects o JOIN public.actors a ON a.id=o.attributed_to
  WHERE o.id=p_poll_id AND public.privacy_object_is_active(o.id)
    AND (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->>'type'='Question'
    AND ((SELECT auth.role()) IN ('anon','service_role') OR public.current_session_is_verified())
    AND ((SELECT auth.role())='service_role' OR a.user_id=(SELECT auth.uid())
      OR (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
      OR (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public');
$$;
REVOKE ALL ON FUNCTION public.readable_poll(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.readable_poll(uuid) TO service_role;

DROP FUNCTION public.get_poll_results(uuid);
CREATE FUNCTION public.get_poll_results(poll_uuid uuid)
RETURNS TABLE(option_index integer,vote_count bigint,voters_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  WITH question AS (SELECT public.readable_poll(poll_uuid) AS body),
  votes AS (SELECT pv.option_index,pv.user_id FROM public.poll_votes pv,question q
    WHERE pv.poll_id=poll_uuid AND q.body IS NOT NULL AND public.privacy_account_is_active(pv.user_id)),
  options AS (SELECT generate_series(0,jsonb_array_length(coalesce(body->'oneOf',body->'anyOf','[]'::jsonb))-1) AS i FROM question)
  SELECT o.i,count(v.user_id),(SELECT count(DISTINCT user_id) FROM votes)
  FROM options o LEFT JOIN votes v ON v.option_index=o.i GROUP BY o.i ORDER BY o.i;
$$;
REVOKE ALL ON FUNCTION public.get_poll_results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_poll_results(uuid) TO anon,authenticated,service_role;

-- Validate and replace a ballot in one transaction. Locking the poll serializes
-- concurrent changes and deletion, so partial or duplicate ballots cannot survive.
CREATE FUNCTION public.set_poll_votes(p_poll_id uuid,p_option_indices integer[])
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE caller uuid := auth.uid(); question jsonb; options jsonb;
BEGIN
  IF caller IS NULL OR NOT public.current_session_is_verified() THEN
    RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501';
  END IF;
  PERFORM id FROM public.ap_objects WHERE id=p_poll_id FOR UPDATE;
  question := public.readable_poll(p_poll_id);
  IF question IS NULL THEN RAISE EXCEPTION 'Poll unavailable' USING ERRCODE='42501'; END IF;
  IF question->>'endTime' IS NULL OR (question->>'endTime')::timestamptz<=clock_timestamp() THEN
    RAISE EXCEPTION 'Poll has closed' USING ERRCODE='23514';
  END IF;
  options := coalesce(question->'oneOf',question->'anyOf');
  IF p_option_indices IS NULL OR cardinality(p_option_indices) NOT BETWEEN 1 AND 4
    OR array_position(p_option_indices,NULL) IS NOT NULL
    OR (question ? 'oneOf' AND cardinality(p_option_indices)<>1)
    OR (SELECT count(DISTINCT i) FROM unnest(p_option_indices) i)<>cardinality(p_option_indices)
    OR EXISTS(SELECT 1 FROM unnest(p_option_indices) i WHERE i<0 OR i>=jsonb_array_length(options)) THEN
    RAISE EXCEPTION 'Invalid ballot' USING ERRCODE='23514';
  END IF;
  DELETE FROM public.poll_votes WHERE poll_id=p_poll_id AND user_id=caller;
  INSERT INTO public.poll_votes(poll_id,user_id,option_index)
    SELECT p_poll_id,caller,i FROM unnest(p_option_indices) i;
END $$;
REVOKE ALL ON FUNCTION public.set_poll_votes(uuid,integer[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_poll_votes(uuid,integer[]) TO authenticated,service_role;
REVOKE INSERT,UPDATE,DELETE ON public.poll_votes FROM PUBLIC,anon,authenticated;

-- Maintenance routines must not be public write APIs.
REVOKE ALL ON FUNCTION public.recalc_company_counts(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.recalc_company_counts(uuid) TO service_role;

COMMIT;
