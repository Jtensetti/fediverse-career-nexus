BEGIN;

-- Text is assessed on Nolto's database. Draft checks are not stored or sent to a
-- third party. These deliberately narrow rules are a triage aid, not a verdict.
CREATE FUNCTION public.assess_public_text(p_text text) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE body text; unquoted text; severe_pattern text;
BEGIN
  IF length(p_text)>200000 THEN RAISE EXCEPTION 'Text exceeds 200000 characters' USING ERRCODE='23514'; END IF;
  body:=lower(normalize(coalesce(p_text,''),NFKC));
  body:=regexp_replace(body,'[​‌‍﻿]','','g');
  body:=regexp_replace(body,'</(p|div|li|h[1-6])>|<br[^>]*>',E'\n','g');
  body:=regexp_replace(body,'<[^>]*>','','g');
  body:=replace(replace(replace(body,'&nbsp;',' '),'&quot;','"'),'&#39;','''');
  severe_pattern:='\m(jag (ska|kommer att|tänker) (döda|mörda|våldta|skjuta) (dig|er)|i( will| am going to|''ll) (kill|murder|rape|shoot) you|ta livet av dig|kill yourself|((döda|utrota) alla (judar|muslimer|invandrare|homosexuella)|kill all (jews|muslims|immigrants|gay people)))\M';
  -- Explicit quotations can still warrant a reminder. A human can review any
  -- report; automated matching cannot reliably infer intent or understand images.
  unquoted:=regexp_replace(body,'["“][^"”]*["”]','','g');
  IF unquoted ~ severe_pattern THEN
    RETURN jsonb_build_object('level','review','reason','threat_or_group_violence');
  END IF;
  IF body ~ severe_pattern OR body ~ '\m(du är (en |ett )?(idiot|imbecill|värdelös|dum i huvudet)|din (jävla )?(idiot|hora)|håll käften|dra åt helvete|you( are|''re) (an? )?(idiot|moron|worthless)|shut the fuck up|fuck (you|off))\M' THEN
    RETURN jsonb_build_object('level','warn','reason','personal_attack');
  END IF;
  RETURN jsonb_build_object('level','allow','reason',NULL);
END $$;
REVOKE ALL ON FUNCTION public.assess_public_text(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assess_public_text(text) TO authenticated,service_role;

CREATE FUNCTION public.moderation_object_text(p_body jsonb) RETURNS text
LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE body jsonb:=p_body; answer text:=''; item jsonb;
BEGIN
  IF jsonb_typeof(body)<>'object' THEN RETURN ''; END IF;
  IF body->>'type' IN ('Create','Update','Announce') AND jsonb_typeof(body->'object')='object' THEN body:=body->'object'; END IF;
  IF jsonb_typeof(body->'content')='object' THEN answer:=public.moderation_object_text(body->'content');
  ELSE answer:=coalesce(body->>'content',''); END IF;
  answer:=answer||E'\n'||coalesce(body->>'name','')||E'\n'||coalesce(body->>'summary','');
  IF jsonb_typeof(body->'contentMap')='object' THEN
    SELECT answer||E'\n'||coalesce(string_agg(value,E'\n'),'') INTO answer FROM jsonb_each_text(body->'contentMap');
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(
    (CASE WHEN jsonb_typeof(body->'oneOf')='array' THEN body->'oneOf' ELSE '[]'::jsonb END)||
    (CASE WHEN jsonb_typeof(body->'anyOf')='array' THEN body->'anyOf' ELSE '[]'::jsonb END)||
    (CASE WHEN jsonb_typeof(body->'attachment')='array' THEN body->'attachment' ELSE '[]'::jsonb END))
  LOOP answer:=answer||E'\n'||coalesce(item->>'name',''); END LOOP;
  RETURN answer;
END $$;
REVOKE ALL ON FUNCTION public.moderation_object_text(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderation_object_text(jsonb) TO authenticated,service_role;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['ap_objects','articles','post_replies'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN moderation_status text NOT NULL DEFAULT ''published'' CHECK(moderation_status IN (''published'',''pending'',''rejected'')), ADD COLUMN moderation_revision uuid NOT NULL DEFAULT gen_random_uuid(), ADD COLUMN moderation_reason text',t);
    EXECUTE format('CREATE INDEX %I ON public.%I(created_at,id) WHERE moderation_status<>''published'' AND deleted_at IS NULL',t||'_review_queue',t);
  END LOOP;
END $$;

CREATE FUNCTION public.moderation_is_owner(p_kind text,p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT public.current_session_is_verified() AND CASE p_kind
    WHEN 'post' THEN EXISTS(SELECT 1 FROM public.ap_objects o LEFT JOIN public.actors a ON a.id=o.attributed_to
      WHERE o.id=p_id AND (a.user_id=auth.uid() OR public.has_company_role(auth.uid(),o.company_id,ARRAY['owner','admin','editor']::public.company_role[])))
    WHEN 'article' THEN EXISTS(SELECT 1 FROM public.articles a WHERE a.id=p_id AND (a.user_id=auth.uid()
      OR EXISTS(SELECT 1 FROM public.article_authors x WHERE x.article_id=a.id AND x.user_id=auth.uid() AND x.can_edit)))
    WHEN 'comment' THEN EXISTS(SELECT 1 FROM public.post_replies WHERE id=p_id AND user_id=auth.uid())
    ELSE false END;
$$;
REVOKE ALL ON FUNCTION public.moderation_is_owner(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderation_is_owner(text,uuid) TO anon,authenticated,service_role;

CREATE FUNCTION public.assess_content_before_write() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE changed boolean; assessment jsonb; source text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF current_user IN ('authenticated','anon') AND
      (NEW.moderation_status IS DISTINCT FROM OLD.moderation_status OR NEW.moderation_revision IS DISTINCT FROM OLD.moderation_revision OR NEW.moderation_reason IS DISTINCT FROM OLD.moderation_reason) THEN
      RAISE EXCEPTION 'Moderation decisions require the review action' USING ERRCODE='42501';
    END IF;
    IF NEW.deleted_at IS NOT NULL THEN RETURN NEW; END IF;
    changed:=(to_jsonb(NEW)-ARRAY['moderation_status','moderation_revision','moderation_reason','updated_at'])
      IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['moderation_status','moderation_revision','moderation_reason','updated_at']);
    IF NOT changed THEN RETURN NEW; END IF;
  END IF;
  IF TG_TABLE_NAME='ap_objects' THEN source:=public.moderation_object_text(NEW.content)||E'\n'||coalesce(NEW.content_warning,'');
  ELSIF TG_TABLE_NAME='articles' THEN
    source:=CASE WHEN NEW.published THEN NEW.title||E'\n'||NEW.content||E'\n'||coalesce(NEW.excerpt,'') ELSE '' END;
  ELSE source:=NEW.content; END IF;
  assessment:=public.assess_public_text(source);
  NEW.moderation_revision:=gen_random_uuid();
  NEW.moderation_status:=CASE WHEN assessment->>'level'='review' THEN 'pending' ELSE 'published' END;
  NEW.moderation_reason:=CASE WHEN NEW.moderation_status='pending' THEN assessment->>'reason' END;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.assess_content_before_write() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; kind text; BEGIN
  FOREACH t IN ARRAY ARRAY['ap_objects','articles','post_replies'] LOOP
    kind:=CASE t WHEN 'ap_objects' THEN 'post' WHEN 'articles' THEN 'article' ELSE 'comment' END;
    EXECUTE format('CREATE TRIGGER assess_content_before_write BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.assess_content_before_write()',t);
    EXECUTE format('CREATE POLICY "Public approved content" ON public.%I AS RESTRICTIVE FOR SELECT TO anon USING(moderation_status=''published'')',t);
    IF t='ap_objects' THEN
      EXECUTE 'CREATE POLICY "Hold content awaiting review" ON public.ap_objects AS RESTRICTIVE FOR SELECT TO authenticated USING(moderation_status=''published'' OR ((SELECT public.current_session_is_verified()) AND (EXISTS(SELECT 1 FROM public.actors a WHERE a.id=attributed_to AND a.user_id=(SELECT auth.uid())) OR public.has_company_role((SELECT auth.uid()),company_id,ARRAY[''owner'',''admin'',''editor'']::public.company_role[]))))';
    ELSE
      EXECUTE format('CREATE POLICY "Hold content awaiting review" ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING(moderation_status=''published'' OR ((SELECT public.current_session_is_verified()) AND user_id=(SELECT auth.uid())))',t);
    END IF;
  END LOOP;
END $$;

-- Decisions reference the current content; the queue does not duplicate its text.
CREATE TABLE public.content_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_kind text NOT NULL CHECK(content_kind IN ('post','article','comment')),
  content_id uuid NOT NULL,
  revision uuid NOT NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK(action IN ('approve','reject','appeal')),
  explanation text NOT NULL CHECK(length(btrim(explanation)) BETWEEN 3 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.content_review_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_review_decisions FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.content_review_decisions TO authenticated;
GRANT ALL ON public.content_review_decisions TO service_role;
CREATE POLICY "Participants read review decisions" ON public.content_review_decisions FOR SELECT TO authenticated
  USING((SELECT public.current_session_is_verified()) AND (public.is_moderator((SELECT auth.uid())) OR public.moderation_is_owner(content_kind,content_id)));
CREATE INDEX review_decisions_content ON public.content_review_decisions(content_kind,content_id,created_at DESC);
CREATE UNIQUE INDEX one_appeal_per_revision ON public.content_review_decisions(content_kind,content_id,revision) WHERE action='appeal';

CREATE FUNCTION public.get_own_review_decisions() RETURNS SETOF public.content_review_decisions
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT d.* FROM public.content_review_decisions d WHERE actor_id=(SELECT auth.uid())
    OR public.moderation_is_owner(content_kind,content_id);
$$;
REVOKE ALL ON FUNCTION public.get_own_review_decisions() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_own_review_decisions() TO authenticated;

CREATE FUNCTION public.get_content_review_queue(p_own boolean DEFAULT false,p_offset integer DEFAULT 0)
RETURNS TABLE(content_kind text,content_id uuid,revision uuid,status text,reason text,body text,created_at timestamptz,can_edit boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.current_session_is_verified() OR (NOT p_own AND NOT public.is_moderator(auth.uid())) THEN
    RAISE EXCEPTION 'Review access required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT q.*,public.moderation_is_owner(q.kind,q.id) FROM (
    SELECT 'post'::text kind,o.id,o.moderation_revision,o.moderation_status,o.moderation_reason,public.moderation_object_text(o.content) text,o.created_at
      FROM public.ap_objects o WHERE o.deleted_at IS NULL AND o.moderation_status<>'published' AND public.privacy_publisher_is_active(o.attributed_to,o.company_id)
    UNION ALL SELECT 'article',a.id,a.moderation_revision,a.moderation_status,a.moderation_reason,a.title||E'\n'||a.content,a.created_at
      FROM public.articles a WHERE a.deleted_at IS NULL AND a.published AND a.moderation_status<>'published' AND public.privacy_account_is_active(a.user_id)
    UNION ALL SELECT 'comment',r.id,r.moderation_revision,r.moderation_status,r.moderation_reason,r.content,r.created_at
      FROM public.post_replies r WHERE r.deleted_at IS NULL AND r.moderation_status<>'published' AND public.privacy_account_is_active(r.user_id)
  ) q WHERE CASE WHEN p_own THEN public.moderation_is_owner(q.kind,q.id) ELSE q.moderation_status='pending' END
  ORDER BY q.created_at,q.id LIMIT 30 OFFSET greatest(0,least(coalesce(p_offset,0),100000));
END $$;
REVOKE ALL ON FUNCTION public.get_content_review_queue(boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_content_review_queue(boolean,integer) TO authenticated;

CREATE FUNCTION public.decide_content_review(p_kind text,p_id uuid,p_revision uuid,p_action text,p_explanation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target text; current_revision uuid; current_status text;
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  IF p_action='appeal' THEN
    IF NOT public.moderation_is_owner(p_kind,p_id) THEN RAISE EXCEPTION 'Author required' USING ERRCODE='42501'; END IF;
  ELSIF p_action IN ('approve','reject') THEN
    IF NOT public.is_moderator(auth.uid()) OR public.moderation_is_owner(p_kind,p_id) THEN
      RAISE EXCEPTION 'Another moderator must review this content' USING ERRCODE='42501'; END IF;
  ELSE RAISE EXCEPTION 'Unknown review action' USING ERRCODE='22023'; END IF;
  target:=CASE p_kind WHEN 'post' THEN 'ap_objects' WHEN 'article' THEN 'articles' WHEN 'comment' THEN 'post_replies' END;
  IF target IS NULL THEN RAISE EXCEPTION 'Unknown content kind' USING ERRCODE='22023'; END IF;
  EXECUTE format('SELECT moderation_revision,moderation_status FROM public.%I WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',target)
    INTO current_revision,current_status USING p_id;
  IF current_revision IS DISTINCT FROM p_revision OR current_status='published' OR (p_action<>'appeal' AND current_status<>'pending') THEN
    RAISE EXCEPTION 'Content changed; reload the review' USING ERRCODE='40001'; END IF;
  INSERT INTO public.content_review_decisions(content_kind,content_id,revision,actor_id,action,explanation)
    VALUES(p_kind,p_id,p_revision,auth.uid(),p_action,btrim(p_explanation));
  EXECUTE format('UPDATE public.%I SET moderation_status=$1 WHERE id=$2',target)
    USING CASE p_action WHEN 'approve' THEN 'published' WHEN 'reject' THEN 'rejected' ELSE 'pending' END,p_id;
END $$;
REVOKE ALL ON FUNCTION public.decide_content_review(text,uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.decide_content_review(text,uuid,uuid,text,text) TO authenticated;

CREATE FUNCTION public.erase_content_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  DELETE FROM public.content_review_decisions WHERE content_kind=TG_ARGV[0] AND content_id=OLD.id;
  RETURN OLD;
END $$;
REVOKE ALL ON FUNCTION public.erase_content_review() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER erase_content_review AFTER DELETE ON public.ap_objects FOR EACH ROW EXECUTE FUNCTION public.erase_content_review('post');
CREATE TRIGGER erase_content_review AFTER DELETE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.erase_content_review('article');
CREATE TRIGGER erase_content_review AFTER DELETE ON public.post_replies FOR EACH ROW EXECUTE FUNCTION public.erase_content_review('comment');

CREATE OR REPLACE FUNCTION public.privacy_object_is_active(p_object_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.ap_objects WHERE id=p_object_id AND deleted_at IS NULL AND moderation_status='published'
    AND public.privacy_publisher_is_active(attributed_to,company_id));
$$;

-- Invoker views still filter explicitly: authors can inspect a held row directly,
-- but it must never masquerade as a published item in their ordinary feed.
CREATE OR REPLACE VIEW public.federated_feed WITH (security_invoker=true) AS
SELECT ap.id,ap.type,ap.content,ap.attributed_to,ap.company_id,ap.published_at,
  CASE WHEN act.is_remote THEN 'remote'::text ELSE 'local'::text END AS source
FROM public.ap_objects ap LEFT JOIN public.actors act ON act.id=ap.attributed_to
WHERE ap.moderation_status='published' AND ap.type IN ('Note','Article','Create','Announce')
  AND ((ap.type<>'Announce' AND ap.content->>'inReplyTo' IS NULL AND ap.content->'object'->>'inReplyTo' IS NULL) OR ap.type='Announce')
  AND coalesce(ap.content->>'type','')<>'Like'
ORDER BY ap.published_at DESC;

CREATE OR REPLACE VIEW public.federation_public_objects WITH (security_invoker=true) AS
SELECT o.* FROM public.ap_objects o JOIN public.actors a ON a.id=o.attributed_to
WHERE a.is_remote=false AND a.status='active' AND a.public_key IS NOT NULL
  AND o.deleted_at IS NULL AND o.moderation_status='published' AND public.privacy_actor_is_active(a.id)
  AND o.type IN ('Create','Note','Article','Question')
  AND (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->>'type' IN ('Note','Article','Question')
  AND ((CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
    OR (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public');

-- Notification text is derived at read time; do not retain rejected article titles.
DROP TRIGGER IF EXISTS trigger_notify_followers_of_article ON public.articles;
CREATE OR REPLACE FUNCTION public.notify_followers_of_article() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.moderation_status<>'published' OR NEW.deleted_at IS NOT NULL OR NOT NEW.published THEN
    DELETE FROM public.notifications WHERE object_id=NEW.id::text AND object_type='article';
  ELSIF TG_OP='INSERT' OR NOT OLD.published OR OLD.moderation_status<>'published' THEN
    INSERT INTO public.notifications(type,recipient_id,actor_id,object_id,object_type)
      SELECT 'article_published',f.follower_id,NEW.user_id,NEW.id::text,'article'
      FROM public.author_follows f WHERE f.author_id=NEW.user_id AND f.follower_id<>NEW.user_id
        AND public.privacy_account_is_active(f.follower_id)
        AND NOT public.is_user_blocked(f.follower_id,NEW.user_id) AND NOT public.is_user_blocked(NEW.user_id,f.follower_id);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_followers_of_article() FROM PUBLIC,anon,authenticated;


CREATE OR REPLACE FUNCTION public.get_member_feed(p_feed text DEFAULT 'following',p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS SETOF public.federated_feed LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE chosen_rules jsonb; prefs public.user_feed_preferences; viewer uuid := (SELECT auth.uid());
BEGIN
  IF viewer IS NULL OR NOT public.current_session_is_verified() THEN
    RAISE EXCEPTION 'Sign in to read this feed' USING ERRCODE='42501';
  END IF;
  IF p_feed IS NULL THEN RAISE EXCEPTION 'Unknown feed' USING ERRCODE='22023'; END IF;
  IF p_feed NOT IN ('following','local','federated') THEN
    SELECT rules INTO chosen_rules FROM public.custom_feeds WHERE id::text=p_feed AND user_id=viewer;
    IF NOT FOUND THEN RAISE EXCEPTION 'Feed not available' USING ERRCODE='42501'; END IF;
  END IF;
  SELECT * INTO prefs FROM public.user_feed_preferences WHERE user_id=viewer;
  RETURN QUERY
  SELECT ap.id,ap.type,ap.content,ap.attributed_to,ap.company_id,ap.published_at,
    CASE WHEN a.is_remote THEN 'remote'::text ELSE 'local'::text END
  FROM public.ap_objects ap
  JOIN public.public_actors a ON a.id=ap.attributed_to
  CROSS JOIN LATERAL (SELECT CASE WHEN ap.type='Create' THEN ap.content->'object'
    WHEN ap.type='Announce' AND jsonb_typeof(ap.content->'object')='object' THEN ap.content->'object'
    ELSE ap.content END AS body) n
  CROSS JOIN LATERAL (SELECT lower(regexp_replace(coalesce(n.body->>'content','')||' '||coalesce(n.body->>'name','')||' '||coalesce(n.body->>'summary',''),'<[^>]*>',' ','g')) AS text) plain
  CROSS JOIN LATERAL (SELECT coalesce(array_agg(DISTINCT tag),ARRAY[]::text[]) AS tags FROM (
    SELECT lower(ltrim(value->>'name','#')) AS tag FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(n.body->'tag')='array' THEN n.body->'tag' ELSE '[]'::jsonb END)
      WHERE value->>'type'='Hashtag'
    UNION ALL
    SELECT lower(m[1]) FROM regexp_matches(plain.text,'(?:^|[^[:alnum:]_])#([[:alnum:]_]+)','g') m
  ) found) hashtags
  WHERE ap.moderation_status='published' AND ap.type IN ('Note','Article','Create','Announce')
    AND coalesce(n.body->>'type','Note') NOT IN ('Like','Delete','Tombstone')
    AND (p_feed<>'local' OR NOT coalesce(a.is_remote,false))
    AND (coalesce(prefs.show_reposts,true) OR ap.type<>'Announce')
    AND (coalesce(prefs.show_replies,false) OR n.body->>'inReplyTo' IS NULL)
    AND NOT public.is_user_blocked(viewer,a.user_id) AND NOT public.is_user_blocked(a.user_id,viewer)
    AND NOT EXISTS (SELECT 1 FROM unnest(prefs.muted_words) word WHERE btrim(word)<>'' AND strpos(plain.text,lower(word))>0)
    AND (coalesce(cardinality(prefs.language_filter),0)=0 OR lower(n.body->>'language')=ANY(prefs.language_filter)
      OR EXISTS(SELECT 1 FROM unnest(prefs.language_filter) lang WHERE n.body->'contentMap' ? lang))
    AND (p_feed<>'following' OR a.user_id=viewer
      OR EXISTS(SELECT 1 FROM public.author_follows f WHERE f.follower_id=viewer AND f.author_id=a.user_id)
      OR EXISTS(SELECT 1 FROM public.user_connections c WHERE c.status='accepted' AND
        ((c.user_id=viewer AND c.connected_user_id=a.user_id) OR (c.connected_user_id=viewer AND c.user_id=a.user_id)))
      OR EXISTS(SELECT 1 FROM public.outgoing_follows f JOIN public.public_actors own ON own.id=f.local_actor_id
        WHERE own.user_id=viewer AND f.status='accepted' AND f.remote_actor_url=a.remote_actor_url))
    AND (chosen_rules IS NULL OR (
      ((chosen_rules->'include_users') ? a.user_id::text
       OR (chosen_rules->'include_actors') ? a.id::text
       OR (chosen_rules->'include_companies') ? ap.company_id::text
       OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'include_tags','[]')) tag WHERE lower(ltrim(tag,'#'))=ANY(hashtags.tags))
       OR EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'include_keywords','[]')) word WHERE strpos(plain.text,lower(word))>0))
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'exclude_tags','[]')) tag WHERE lower(ltrim(tag,'#'))=ANY(hashtags.tags))
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements_text(coalesce(chosen_rules->'exclude_keywords','[]')) word WHERE strpos(plain.text,lower(word))>0)
      AND (coalesce(jsonb_array_length(chosen_rules->'language'),0)=0 OR chosen_rules->'language' ? lower(n.body->>'language'))
    ))
  ORDER BY ap.published_at DESC,ap.id DESC
  LIMIT greatest(1,least(coalesce(p_limit,20),100)) OFFSET greatest(0,least(coalesce(p_offset,0),100000));
END $$;

CREATE OR REPLACE FUNCTION public.resolve_public_media(p_bucket text,p_name text,p_url text)
RETURNS TABLE(id uuid,mime_type text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT o.id,o.metadata->>'mimetype' FROM storage.objects o
  WHERE o.bucket_id=p_bucket AND o.name=p_name AND p_bucket IN ('avatars','posts','articles','article-covers','article-images','company-assets')
    AND NOT public.privacy_media_is_hidden(p_bucket,p_name)
    AND public.privacy_account_is_active(coalesce(o.owner,nullif(o.owner_id,'')::uuid))
    AND (
      EXISTS(SELECT 1 FROM public.profiles WHERE deleted_at IS NULL AND (id=o.owner OR id::text=o.owner_id) AND (avatar_url=p_url OR header_url=p_url))
      OR EXISTS(SELECT 1 FROM public.companies c WHERE is_active AND (logo_url=p_url OR banner_url=p_url)
        AND EXISTS(SELECT 1 FROM public.company_roles r WHERE r.company_id=c.id AND (r.user_id=o.owner OR r.user_id::text=o.owner_id)))
      OR EXISTS(SELECT 1 FROM public.articles WHERE deleted_at IS NULL AND moderation_status='published' AND published AND (user_id=o.owner OR user_id::text=o.owner_id) AND public.privacy_account_is_active(user_id)
        AND (cover_image_url=p_url OR strpos(content,p_url)>0))
      OR EXISTS(SELECT 1 FROM public.ap_objects WHERE deleted_at IS NULL AND moderation_status='published' AND public.privacy_actor_is_active(attributed_to)
        AND EXISTS(SELECT 1 FROM public.actors a WHERE a.id=attributed_to AND (a.user_id=o.owner OR a.user_id::text=o.owner_id))
        AND strpos(content::text,p_url)>0 AND (
          (CASE WHEN type='Create' THEN content->'object' ELSE content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
          OR (CASE WHEN type='Create' THEN content->'object' ELSE content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'))
      OR EXISTS(SELECT 1 FROM public.events WHERE cover_image_url=p_url AND (user_id=o.owner OR user_id::text=o.owner_id) AND visibility='public' AND public.privacy_account_is_active(user_id))
      OR EXISTS(SELECT 1 FROM public.starter_packs WHERE cover_image_url=p_url AND (creator_id=o.owner OR creator_id::text=o.owner_id) AND public.privacy_account_is_active(creator_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.get_post_replies(post_id uuid, max_replies integer DEFAULT 50)
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
  WHERE ao.moderation_status='published' AND public.privacy_object_is_active(post_id) AND ao.type = 'Note'
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
;

CREATE OR REPLACE FUNCTION public.notify_local_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE caller uuid:=auth.uid(); body jsonb; recipient record;
BEGIN
  IF NEW.moderation_status<>'published' OR NEW.deleted_at IS NOT NULL THEN
    DELETE FROM public.notifications WHERE object_id=NEW.id::text AND object_type IN ('post','reply');
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' AND OLD.moderation_status='published' THEN RETURN NEW; END IF;
  IF NEW.type NOT IN ('Create','Note','Question') THEN RETURN NEW; END IF;
  IF NEW.attributed_to IS NOT NULL THEN
    SELECT user_id INTO caller FROM public.actors WHERE id=NEW.attributed_to AND NOT is_remote;
  ELSIF TG_OP='UPDATE' THEN RETURN NEW; END IF;
  IF caller IS NULL OR NOT public.privacy_account_is_active(caller) THEN RETURN NEW; END IF;
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
DROP TRIGGER notify_local_post ON public.ap_objects;
CREATE TRIGGER notify_local_post AFTER INSERT OR UPDATE ON public.ap_objects FOR EACH ROW EXECUTE FUNCTION public.notify_local_post();

CREATE OR REPLACE FUNCTION public.queue_local_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data public.ap_objects; object_data jsonb; activity_kind text; snapshot jsonb;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.deleted_at IS NOT NULL OR OLD.moderation_status<>'published' THEN RETURN NULL; END IF;
    row_data:=OLD; activity_kind:='Delete';
  ELSIF TG_OP='UPDATE' AND OLD.deleted_at IS NULL AND OLD.moderation_status='published' AND (NEW.deleted_at IS NOT NULL OR NEW.moderation_status<>'published') THEN
    row_data:=OLD; activity_kind:='Delete';
  ELSIF TG_OP='UPDATE' AND NEW.deleted_at IS NULL AND NEW.moderation_status='published' AND OLD.moderation_status<>'published' THEN
    DELETE FROM public.federation_tombstones WHERE id=NEW.id;
    row_data:=NEW; activity_kind:='Create';
  ELSIF TG_OP='UPDATE' THEN
    IF NEW.moderation_status<>'published' OR NEW.deleted_at IS NOT NULL OR NEW.content IS NOT DISTINCT FROM OLD.content THEN RETURN NULL; END IF;
    row_data:=NEW; activity_kind:='Update';
  ELSE
    IF NEW.moderation_status<>'published' THEN RETURN NULL; END IF;
    row_data:=NEW; activity_kind:='Create';
  END IF;
  object_data:=CASE WHEN row_data.type='Create' THEN row_data.content->'object' ELSE row_data.content END;
  IF activity_kind='Delete' THEN
    DELETE FROM public.federation_queue_partitioned WHERE activity->>'object_id'=row_data.id::text OR activity->'snapshot'->>'id'=row_data.id::text;
    DELETE FROM public.activities WHERE actor_id=row_data.attributed_to AND
      (payload->'object'->>'id'=object_data->>'id' OR payload->>'object'=object_data->>'id');
  END IF;
  IF row_data.type NOT IN ('Create','Note','Article','Question') OR object_data->>'type' NOT IN ('Note','Article','Question')
    OR NOT coalesce((object_data->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (object_data->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'),false)
    OR NOT EXISTS(SELECT 1 FROM public.actors WHERE id=row_data.attributed_to AND NOT is_remote AND status='active' AND public_key IS NOT NULL)
  THEN RETURN NULL; END IF;
  IF activity_kind='Delete' THEN
    INSERT INTO public.federation_tombstones(id) VALUES(row_data.id) ON CONFLICT DO NOTHING;
    snapshot:=jsonb_build_object('id',row_data.id,'content',jsonb_build_object('type',object_data->>'type',
      'to',jsonb_build_array('https://www.w3.org/ns/activitystreams#Public'),'cc',coalesce(object_data->'cc','[]')));
  ELSE snapshot:=to_jsonb(row_data); END IF;
  INSERT INTO public.federation_queue_partitioned(actor_id,activity,status,partition_key,priority)
    VALUES(row_data.attributed_to,jsonb_build_object('type',activity_kind,'needs_enrichment',true,'object_id',row_data.id,
      'activity_id',gen_random_uuid(),'snapshot',snapshot),'pending',public.actor_id_to_partition_key(row_data.attributed_to),5);
  RETURN NULL;
END $$;
NOTIFY pgrst,'reload schema';

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
COMMIT;
