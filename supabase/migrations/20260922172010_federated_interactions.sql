BEGIN;

CREATE TABLE public.federated_likes (
  activity_id text PRIMARY KEY CHECK(length(activity_id) BETWEEN 1 AND 2048),
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.ap_objects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(actor_id,target_id)
);
CREATE INDEX federated_likes_target_idx ON public.federated_likes(target_id);
ALTER TABLE public.federated_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federated_likes FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.federated_likes TO anon,authenticated;
GRANT ALL ON public.federated_likes TO service_role;
CREATE POLICY "Visible federated reactions" ON public.federated_likes FOR SELECT TO anon,authenticated
  USING(public.privacy_object_is_active(target_id) AND public.privacy_actor_is_active(actor_id)
    AND EXISTS(SELECT 1 FROM public.ap_objects WHERE id=target_id AND moderation_status='published'));

CREATE TABLE public.federation_reply_links (
  reply_id uuid PRIMARY KEY REFERENCES public.ap_objects(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL REFERENCES public.ap_objects(id) ON DELETE CASCADE,
  root_id uuid NOT NULL REFERENCES public.ap_objects(id) ON DELETE CASCADE,
  CHECK(reply_id<>parent_id AND reply_id<>root_id)
);
CREATE INDEX federation_reply_roots_idx ON public.federation_reply_links(root_id);
ALTER TABLE public.federation_reply_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federation_reply_links FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.federation_reply_links TO anon,authenticated;
GRANT ALL ON public.federation_reply_links TO service_role;
CREATE POLICY "Visible reply relationships" ON public.federation_reply_links FOR SELECT TO anon,authenticated
  USING(public.privacy_object_is_active(reply_id) AND public.privacy_object_is_active(root_id));

-- Only the signature-verifying inbox may record a remote identity's reaction.
CREATE FUNCTION public.record_remote_like(p_activity_id text,p_actor_id uuid,p_target_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.actors WHERE id=p_actor_id AND is_remote AND status='active')
    OR NOT public.privacy_object_is_active(p_target_id)
    OR NOT EXISTS(SELECT 1 FROM public.ap_objects o WHERE id=p_target_id AND moderation_status='published'
      AND coalesce((CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
        OR (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public',false)) THEN RETURN; END IF;
  IF EXISTS(SELECT 1 FROM public.federated_likes WHERE activity_id=p_activity_id AND (actor_id<>p_actor_id OR target_id<>p_target_id)) THEN
    RAISE EXCEPTION 'Reaction identity mismatch' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.federated_likes(activity_id,actor_id,target_id) VALUES(p_activity_id,p_actor_id,p_target_id) ON CONFLICT DO NOTHING;
END $$;
CREATE FUNCTION public.undo_remote_interaction(p_activity_id text,p_actor_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  DELETE FROM public.federated_likes WHERE activity_id=p_activity_id AND actor_id=p_actor_id;
  DELETE FROM public.ap_objects WHERE remote_object_id=p_activity_id AND attributed_to=p_actor_id AND type IN('Like','Announce');
END $$;
REVOKE ALL ON FUNCTION public.record_remote_like(text,uuid,uuid),public.undo_remote_interaction(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_remote_like(text,uuid,uuid),public.undo_remote_interaction(text,uuid) TO service_role;

CREATE FUNCTION public.get_federated_like_counts(p_ids uuid[])
RETURNS TABLE(target_id uuid,like_count bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT l.target_id,count(*) FROM public.federated_likes l
  WHERE l.target_id=ANY(p_ids[1:100]) GROUP BY l.target_id;
$$;
REVOKE ALL ON FUNCTION public.get_federated_like_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_federated_like_counts(uuid[]) TO anon,authenticated;

-- One standard Like represents a local reaction; changing the local emoji does
-- not create a second favourite on Mastodon. Deletion delivers a matching Undo.
CREATE FUNCTION public.queue_federated_reaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.reactions; local_actor uuid; target record;
BEGIN
  r:=CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
  IF r.target_type NOT IN('post','reply') THEN RETURN NULL; END IF;
  SELECT id INTO local_actor FROM public.actors WHERE user_id=r.user_id AND NOT is_remote AND status='active' AND public_key IS NOT NULL;
  IF local_actor IS NULL OR NOT public.privacy_account_is_active(r.user_id) THEN RETURN NULL; END IF;
  SELECT o.id,o.remote_object_id,a.is_remote,a.remote_actor_url,a.preferred_username,
    CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END AS body
    INTO target FROM public.ap_objects o JOIN public.actors a ON a.id=o.attributed_to
    WHERE o.id=r.target_id AND o.moderation_status='published' AND public.privacy_object_is_active(o.id);
  IF target IS NULL OR NOT coalesce((target.body->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR
    (target.body->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false) THEN RETURN NULL; END IF;
  INSERT INTO public.federation_queue_partitioned(actor_id,activity,status,partition_key,priority)
    VALUES(local_actor,jsonb_build_object('type',CASE WHEN TG_OP='DELETE' THEN 'Undo' ELSE 'Like' END,'interaction','reaction',
      'snapshot',jsonb_build_object('reaction_id',r.id,'target_id',target.id,'remote_object_id',target.remote_object_id,
        'target_remote',target.is_remote,'target_actor_url',target.remote_actor_url,'target_username',target.preferred_username)),
      'pending',public.actor_id_to_partition_key(local_actor),5);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.queue_federated_reaction() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER queue_federated_reaction AFTER INSERT OR DELETE ON public.reactions FOR EACH ROW EXECUTE FUNCTION public.queue_federated_reaction();

CREATE OR REPLACE FUNCTION public.get_post_replies(post_id uuid,max_replies integer DEFAULT 50)
RETURNS TABLE(id uuid,content jsonb,created_at timestamptz,actor_user_id uuid,actor_username text,company_id uuid)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT o.id,CASE WHEN l.reply_id IS NULL THEN o.content ELSE o.content || jsonb_build_object('inReplyTo',l.parent_id::text,'rootPost',l.root_id::text) END,
    o.created_at,a.user_id,a.preferred_username,o.company_id
  FROM public.ap_objects o LEFT JOIN public.public_actors a ON a.id=o.attributed_to
    LEFT JOIN public.federation_reply_links l ON l.reply_id=o.id
  WHERE o.type='Note' AND o.moderation_status='published' AND public.privacy_object_is_active(post_id) AND public.privacy_object_is_active(o.id)
    AND (l.root_id=post_id OR o.content->>'inReplyTo'=post_id::text OR o.content->>'rootPost'=post_id::text
      OR o.content->'content'->>'inReplyTo'=post_id::text OR o.content->'content'->>'rootPost'=post_id::text)
  ORDER BY o.created_at,o.id LIMIT greatest(1,least(coalesce(max_replies,50),100));
$$;
CREATE OR REPLACE FUNCTION public.get_batch_reply_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid,reply_count bigint) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT wanted.id,count(DISTINCT o.id)
  FROM (SELECT DISTINCT unnest(post_ids[1:100]) AS id) wanted
  JOIN public.ap_objects o ON o.type='Note' AND o.moderation_status='published' AND public.privacy_object_is_active(o.id)
  LEFT JOIN public.federation_reply_links l ON l.reply_id=o.id
  WHERE public.privacy_object_is_active(wanted.id) AND (l.root_id=wanted.id OR o.content->>'rootPost'=wanted.id::text
    OR o.content->>'inReplyTo'=wanted.id::text OR o.content->'content'->>'rootPost'=wanted.id::text OR o.content->'content'->>'inReplyTo'=wanted.id::text)
  GROUP BY wanted.id;
$$;

CREATE OR REPLACE FUNCTION public.create_post_reply(p_post_id uuid,p_content text,p_parent_reply_id uuid DEFAULT NULL,p_company_id uuid DEFAULT NULL)
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
  IF NOT public.privacy_object_is_active(p_post_id) OR NOT public.privacy_object_is_active(coalesce(p_parent_reply_id,p_post_id)) OR root_body IS NULL OR parent IS NULL
    OR coalesce(root_body->>'type','') NOT IN('Note','Question')
    OR coalesce(parent->>'type','') NOT IN('Note','Question')
    OR NOT coalesce((root_body->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (root_body->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    OR NOT coalesce((parent->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (parent->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    OR (p_parent_reply_id IS NOT NULL AND p_parent_reply_id<>p_post_id AND parent->>'rootPost' IS DISTINCT FROM p_post_id::text AND NOT EXISTS(SELECT 1 FROM public.federation_reply_links l WHERE l.reply_id=p_parent_reply_id AND l.root_id=p_post_id)) THEN
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

NOTIFY pgrst,'reload schema';
COMMIT;
