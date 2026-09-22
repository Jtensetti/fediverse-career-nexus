BEGIN;

-- Organisation posts do not have a personal actor. Keep them visible while the
-- organisation is active, without reopening actorless or deleted personal posts.
CREATE FUNCTION public.privacy_publisher_is_active(p_actor_id uuid,p_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (p_actor_id IS NOT NULL AND public.privacy_actor_is_active(p_actor_id))
    OR (p_actor_id IS NULL AND EXISTS(SELECT 1 FROM public.companies WHERE id=p_company_id AND is_active));
$$;
REVOKE ALL ON FUNCTION public.privacy_publisher_is_active(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.privacy_publisher_is_active(uuid,uuid) TO anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.privacy_object_is_active(p_object_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.ap_objects WHERE id=p_object_id AND deleted_at IS NULL
    AND public.privacy_publisher_is_active(attributed_to,company_id));
$$;
DROP POLICY "Hide deleted objects" ON public.ap_objects;
CREATE POLICY "Hide deleted objects" ON public.ap_objects AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING(deleted_at IS NULL AND public.privacy_publisher_is_active(attributed_to,company_id))
  WITH CHECK(deleted_at IS NULL AND public.privacy_publisher_is_active(attributed_to,company_id));

CREATE FUNCTION public.create_post_reply(p_post_id uuid,p_content text,p_parent_reply_id uuid DEFAULT NULL,p_company_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE caller uuid:=auth.uid(); actor_id uuid; parent jsonb; root_body jsonb; company jsonb;
  reply_id uuid:=gen_random_uuid(); body jsonb;
BEGIN
  IF caller IS NULL OR NOT public.current_session_is_verified() THEN
    RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501';
  END IF;
  IF p_content IS NULL OR length(btrim(p_content)) NOT BETWEEN 1 AND 5000 THEN
    RAISE EXCEPTION 'Reply must contain 1 to 5000 characters' USING ERRCODE='23514';
  END IF;
  SELECT CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END INTO root_body
    FROM public.ap_objects o WHERE o.id=p_post_id;
  SELECT CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END INTO parent
    FROM public.ap_objects o WHERE o.id=coalesce(p_parent_reply_id,p_post_id);
  IF root_body IS NULL OR parent IS NULL
    OR coalesce(root_body->>'type','') NOT IN('Note','Question')
    OR coalesce(parent->>'type','') NOT IN('Note','Question')
    OR NOT coalesce((root_body->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (root_body->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    OR NOT coalesce((parent->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (parent->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    OR (p_parent_reply_id IS NOT NULL AND p_parent_reply_id<>p_post_id AND parent->>'rootPost' IS DISTINCT FROM p_post_id::text) THEN
    RAISE EXCEPTION 'Public reply target unavailable' USING ERRCODE='42501';
  END IF;
  SELECT id INTO actor_id FROM public.actors WHERE user_id=caller AND NOT is_remote;
  IF actor_id IS NULL THEN RAISE EXCEPTION 'Local actor required' USING ERRCODE='23514'; END IF;
  IF p_company_id IS NOT NULL THEN
    IF NOT public.has_company_role(caller,p_company_id,ARRAY['owner','admin','editor']::public.company_role[]) THEN
      RAISE EXCEPTION 'Company permission required' USING ERRCODE='42501';
    END IF;
    SELECT jsonb_build_object('id',id,'name',name,'slug',slug,'logo_url',logo_url) INTO company
      FROM public.companies WHERE id=p_company_id;
  END IF;
  body:=jsonb_build_object('type','Note','content',btrim(p_content),'inReplyTo',coalesce(p_parent_reply_id,p_post_id)::text,
    'rootPost',p_post_id::text,'to',jsonb_build_array('https://www.w3.org/ns/activitystreams#Public'),'published',now());
  IF company IS NOT NULL THEN body:=body || jsonb_build_object('company',company); END IF;
  INSERT INTO public.ap_objects(id,type,content,attributed_to,company_id)
    VALUES(reply_id,'Note',body,CASE WHEN p_company_id IS NULL THEN actor_id ELSE NULL END,p_company_id);
  RETURN reply_id;
END $$;
REVOKE ALL ON FUNCTION public.create_post_reply(uuid,text,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_post_reply(uuid,text,uuid,uuid) TO authenticated;

-- Clients cannot forge notifications. Derive recipients from a committed public
-- local post, without copying its text into another retention surface.
CREATE FUNCTION public.notify_local_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE caller uuid:=auth.uid(); body jsonb; recipient record;
BEGIN
  IF (SELECT auth.role())<>'authenticated' OR NOT public.current_session_is_verified()
    OR NEW.type NOT IN('Create','Note','Question') THEN RETURN NEW; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.actors WHERE id=NEW.attributed_to AND user_id=caller AND NOT is_remote)
    AND NOT (NEW.company_id IS NOT NULL AND public.has_company_role(caller,NEW.company_id,ARRAY['owner','admin','editor']::public.company_role[])) THEN RETURN NEW; END IF;
  body:=CASE WHEN NEW.type='Create' THEN NEW.content->'object' ELSE NEW.content END;
  IF NOT coalesce((body->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (body->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    OR NOT public.privacy_object_is_active(NEW.id) THEN RETURN NEW; END IF;

  FOR recipient IN
    WITH candidates AS (
      SELECT p.id,'mention'::text AS kind FROM public.profiles p
      WHERE lower(p.username) IN (
        SELECT lower(m[2]) FROM regexp_matches(
          regexp_replace(left(coalesce(body->>'content',''),50000),'<[^>]*>',' ','g'),
          '(^|[^A-Za-z0-9_@])@([A-Za-z0-9_]{3,30})(?![A-Za-z0-9_@])','g') AS m)
      UNION ALL
      SELECT a.user_id,'reply'::text FROM public.ap_objects o JOIN public.actors a ON a.id=o.attributed_to
      WHERE o.id::text=ANY(ARRAY[body->>'rootPost',body->>'inReplyTo']) AND NOT a.is_remote
        AND public.privacy_object_is_active(o.id)
        AND coalesce(((CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public')
          OR ((CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    ) SELECT DISTINCT ON(id) id,kind FROM candidates c WHERE id IS NOT NULL AND id<>caller
      AND public.privacy_account_is_active(id)
      AND NOT EXISTS(SELECT 1 FROM public.user_blocks b WHERE
        (b.blocker_id=caller AND b.blocked_user_id=c.id) OR (b.blocker_id=c.id AND b.blocked_user_id=caller))
      ORDER BY id,kind DESC LIMIT 50
  LOOP
    INSERT INTO public.notifications(type,recipient_id,actor_id,object_id,object_type)
      VALUES(recipient.kind,recipient.id,caller,NEW.id::text,CASE WHEN body ? 'inReplyTo' THEN 'reply' ELSE 'post' END);
  END LOOP;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_local_post() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_local_post AFTER INSERT ON public.ap_objects FOR EACH ROW EXECUTE FUNCTION public.notify_local_post();

COMMIT;
