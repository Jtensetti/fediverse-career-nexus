BEGIN;

ALTER TABLE public.profiles ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.ap_objects ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.articles ADD COLUMN deleted_at timestamptz;
ALTER TABLE public.post_replies ADD COLUMN deleted_at timestamptz;
CREATE TABLE public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK(kind IN ('account','post','article','comment','file')),
  subject_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  purge_after timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  encrypted_payload text NOT NULL CHECK(encrypted_payload LIKE 'v2:%'),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','processing')),
  lease_id uuid,
  claimed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  auth_banned boolean NOT NULL DEFAULT false,
  UNIQUE(kind,subject_id),
  CHECK(purge_after >= requested_at)
);
CREATE INDEX deletion_requests_due_idx ON public.deletion_requests(purge_after, id);
CREATE TABLE public.deletion_media (
  bucket_id text NOT NULL,
  name text NOT NULL,
  request_id uuid NOT NULL REFERENCES public.deletion_requests(id) ON DELETE CASCADE,
  object_id uuid NOT NULL,
  archived_path text,
  last_attempt_at timestamptz,
  source_removed boolean NOT NULL DEFAULT false,
  PRIMARY KEY(bucket_id,name)
);
CREATE INDEX deletion_media_request_idx ON public.deletion_media(request_id);
CREATE INDEX deletion_media_pending_idx ON public.deletion_media(request_id) WHERE NOT source_removed;
ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deletion_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.deletion_requests,public.deletion_media FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.deletion_requests,public.deletion_media TO service_role;

CREATE FUNCTION public.privacy_account_is_active(p_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_user_id IS NULL OR EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user_id AND deleted_at IS NULL);
$$;
CREATE FUNCTION public.privacy_actor_is_active(p_actor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.actors WHERE id=p_actor_id AND public.privacy_account_is_active(user_id));
$$;
CREATE FUNCTION public.privacy_object_is_active(p_object_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.ap_objects WHERE id=p_object_id AND deleted_at IS NULL AND public.privacy_actor_is_active(attributed_to));
$$;
REVOKE ALL ON FUNCTION public.privacy_account_is_active(uuid),public.privacy_actor_is_active(uuid),public.privacy_object_is_active(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.privacy_account_is_active(uuid),public.privacy_actor_is_active(uuid),public.privacy_object_is_active(uuid) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.current_session_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT (SELECT auth.uid()) IS NOT NULL AND public.privacy_account_is_active((SELECT auth.uid()))
    AND EXISTS(SELECT 1 FROM auth.sessions s WHERE s.id::text=(SELECT auth.jwt()->>'session_id') AND s.user_id=(SELECT auth.uid())
      AND (s.not_after IS NULL OR s.not_after>now())) AND NOT public.is_user_banned((SELECT auth.uid()));
$$;

-- Apply at the data boundary, including joins and direct API calls. These policies
-- only restrict existing permissions; they do not make private tables public.
DO $$
DECLARE spec record; clause text; field text;
BEGIN
  FOR spec IN SELECT * FROM (VALUES
    ('profiles',ARRAY['id']), ('actors',ARRAY['user_id']), ('articles',ARRAY['user_id']),
    ('post_replies',ARRAY['user_id']), ('experiences',ARRAY['user_id']), ('education',ARRAY['user_id']),
    ('skills',ARRAY['user_id']), ('cv_sections',ARRAY['user_id']), ('job_posts',ARRAY['user_id']),
    ('events',ARRAY['user_id']), ('starter_packs',ARRAY['creator_id']), ('article_authors',ARRAY['user_id']),
    ('company_employees',ARRAY['user_id']), ('company_followers',ARRAY['user_id']), ('company_roles',ARRAY['user_id']),
    ('author_follows',ARRAY['follower_id','author_id']), ('user_connections',ARRAY['user_id','connected_user_id']),
    ('recommendations',ARRAY['recommender_id','recipient_id']), ('messages',ARRAY['sender_id','recipient_id']),
    ('message_requests',ARRAY['sender_id','recipient_id']), ('job_conversations',ARRAY['applicant_id','poster_id']),
    ('notifications',ARRAY['recipient_id','actor_id']), ('reactions',ARRAY['user_id']),
    ('article_reactions',ARRAY['user_id']), ('poll_votes',ARRAY['user_id']), ('starter_pack_members',ARRAY['user_id']),
    ('skill_endorsements',ARRAY['endorser_id']), ('message_public_keys',ARRAY['user_id']), ('message_key_backups',ARRAY['user_id'])
  ) AS rules(table_name, fields)
  LOOP
    clause := '';
    FOREACH field IN ARRAY spec.fields LOOP
      IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=spec.table_name AND column_name=field) THEN
        RAISE EXCEPTION 'Privacy mapping is missing %.%', spec.table_name,field;
      END IF;
      clause := clause || CASE WHEN clause='' THEN '' ELSE ' AND ' END || format('public.privacy_account_is_active(%I)',field);
    END LOOP;
    EXECUTE format('CREATE POLICY "Hide accounts pending deletion" ON public.%I AS RESTRICTIVE FOR ALL TO anon,authenticated USING (%s) WITH CHECK (%s)',spec.table_name,clause,clause);
  END LOOP;
END $$;
CREATE POLICY "Hide deleted objects" ON public.ap_objects AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING(deleted_at IS NULL AND public.privacy_actor_is_active(attributed_to)) WITH CHECK(deleted_at IS NULL AND public.privacy_actor_is_active(attributed_to));
CREATE POLICY "Hide deleted articles" ON public.articles AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING(deleted_at IS NULL) WITH CHECK(deleted_at IS NULL);
CREATE POLICY "Hide deleted replies" ON public.post_replies AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING(deleted_at IS NULL AND public.privacy_object_is_active(post_id)) WITH CHECK(deleted_at IS NULL AND public.privacy_object_is_active(post_id));
CREATE POLICY "Hide deleted actor activities" ON public.activities AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING(public.privacy_actor_is_active(actor_id)) WITH CHECK(public.privacy_actor_is_active(actor_id));

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT id,username,fullname,headline,avatar_url,location,bio,is_verified,is_freelancer,created_at,home_instance,
  freelancer_skills,freelancer_rate,freelancer_availability,website,header_url,auth_type,remote_actor_url
FROM public.profiles WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.can_view_profile_section(owner_id uuid, section_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT owner_id IS NOT NULL AND public.privacy_account_is_active(owner_id) AND (
    (owner_id=(SELECT auth.uid()) AND public.current_session_is_verified())
    OR coalesce((SELECT visibility::text FROM public.profile_section_visibility WHERE user_id=owner_id AND section=section_name),'everyone')='everyone'
    OR (public.current_session_is_verified() AND (
      coalesce((SELECT visibility::text FROM public.profile_section_visibility WHERE user_id=owner_id AND section=section_name),'everyone')='logged_in'
      OR (coalesce((SELECT visibility::text FROM public.profile_section_visibility WHERE user_id=owner_id AND section=section_name),'everyone')='connections'
        AND public.are_users_connected((SELECT auth.uid()),owner_id))
    )));
$$;

-- A caller cannot edit or revive retained rows, including through broad old grants.
CREATE FUNCTION public.protect_deletion_state() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
  IF current_user IN ('anon','authenticated') AND (NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR OLD.deleted_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Use the deletion endpoint' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_deletion_state() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_deletion_state BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_deletion_state();
CREATE TRIGGER protect_deletion_state BEFORE UPDATE ON public.ap_objects FOR EACH ROW EXECUTE FUNCTION public.protect_deletion_state();
CREATE TRIGGER protect_deletion_state BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.protect_deletion_state();
CREATE TRIGGER protect_deletion_state BEFORE UPDATE ON public.post_replies FOR EACH ROW EXECUTE FUNCTION public.protect_deletion_state();
REVOKE DELETE ON public.profiles,public.ap_objects,public.articles,public.post_replies FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.schedule_content_deletion(p_kind text,p_id uuid,p_owner_id uuid,p_updated_at timestamptz,p_encrypted_payload text,p_files jsonb DEFAULT '[]')
RETURNS public.deletion_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE actual_owner uuid; changed_at timestamptz; hidden_at timestamptz; request public.deletion_requests; item jsonb;
BEGIN
  IF p_kind='post' THEN
    SELECT coalesce(a.user_id,a.id),o.updated_at,o.deleted_at INTO actual_owner,changed_at,hidden_at FROM public.ap_objects o
      JOIN public.actors a ON a.id=o.attributed_to WHERE o.id=p_id FOR UPDATE OF o;
  ELSIF p_kind='article' THEN
    SELECT user_id,updated_at,deleted_at INTO actual_owner,changed_at,hidden_at FROM public.articles WHERE id=p_id FOR UPDATE;
  ELSIF p_kind='comment' THEN
    SELECT user_id,updated_at,deleted_at INTO actual_owner,changed_at,hidden_at FROM public.post_replies WHERE id=p_id FOR UPDATE;
  ELSE RAISE EXCEPTION 'Invalid content kind'; END IF;
  IF actual_owner IS NULL OR actual_owner<>p_owner_id THEN RAISE EXCEPTION 'Content owner mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO request FROM public.deletion_requests WHERE kind=p_kind AND subject_id=p_id;
  IF FOUND THEN RETURN request; END IF;
  IF changed_at IS DISTINCT FROM p_updated_at THEN RAISE EXCEPTION 'Content changed, retry' USING ERRCODE='40001'; END IF;
  IF hidden_at IS NOT NULL THEN RAISE EXCEPTION 'Content already hidden'; END IF;
  INSERT INTO public.deletion_requests(kind,subject_id,owner_id,encrypted_payload) VALUES(p_kind,p_id,p_owner_id,p_encrypted_payload) RETURNING * INTO request;
  UPDATE public.deletion_requests SET purge_after=least(purge_after,coalesce((SELECT purge_after FROM public.deletion_requests WHERE kind='account' AND owner_id=p_owner_id),purge_after))
    WHERE id=request.id RETURNING * INTO request;
  FOR item IN SELECT value FROM jsonb_array_elements(p_files) LOOP
    INSERT INTO public.deletion_media(bucket_id,name,request_id,object_id)
    SELECT bucket_id,name,request.id,id FROM storage.objects
      WHERE bucket_id=item->>'bucket' AND name=item->>'name' AND (owner=p_owner_id OR owner_id=p_owner_id::text)
    ON CONFLICT(bucket_id,name) DO NOTHING;
  END LOOP;
  IF p_kind='post' THEN
    UPDATE public.ap_objects SET deleted_at=request.requested_at,content=jsonb_build_object('type','Tombstone'),content_warning=NULL WHERE id=p_id;
  ELSIF p_kind='article' THEN
    UPDATE public.articles SET deleted_at=request.requested_at,published=false,title='',content='',excerpt=NULL,cover_image_url=NULL,tags=NULL,slug=NULL WHERE id=p_id;
  ELSE UPDATE public.post_replies SET deleted_at=request.requested_at,content='' WHERE id=p_id; END IF;
  DELETE FROM public.notifications WHERE object_id=p_id::text;
  RETURN request;
END $$;
REVOKE ALL ON FUNCTION public.schedule_content_deletion(text,uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_content_deletion(text,uuid,uuid,timestamptz,text,jsonb) TO service_role;

CREATE FUNCTION public.schedule_account_deletion(p_user_id uuid,p_updated_at timestamptz,p_encrypted_payload text)
RETURNS public.deletion_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE profile public.profiles; request public.deletion_requests; actor public.actors;
BEGIN
  SELECT * INTO STRICT profile FROM public.profiles WHERE id=p_user_id FOR UPDATE;
  SELECT * INTO request FROM public.deletion_requests WHERE kind='account' AND subject_id=p_user_id;
  IF FOUND THEN RETURN request; END IF;
  IF profile.updated_at IS DISTINCT FROM p_updated_at THEN RAISE EXCEPTION 'Profile changed, retry' USING ERRCODE='40001'; END IF;
  PERFORM c.id FROM public.companies c JOIN public.company_roles r ON r.company_id=c.id
    WHERE r.user_id=p_user_id AND r.role='owner' ORDER BY c.id FOR UPDATE OF c;
  IF EXISTS(SELECT 1 FROM public.company_roles own WHERE own.user_id=p_user_id AND own.role='owner'
    AND NOT EXISTS(SELECT 1 FROM public.company_roles other WHERE other.company_id=own.company_id AND other.role='owner' AND other.user_id<>p_user_id AND public.privacy_account_is_active(other.user_id))) THEN
    RAISE EXCEPTION 'Transfer organisation ownership first'; END IF;
  IF EXISTS(SELECT 1 FROM storage.objects WHERE (owner=p_user_id OR owner_id=p_user_id::text) AND (bucket_id='company-assets' OR name LIKE 'company-posts/%')) THEN
    RAISE EXCEPTION 'Transfer organisation files first'; END IF;
  INSERT INTO public.deletion_requests(kind,subject_id,owner_id,encrypted_payload) VALUES('account',p_user_id,p_user_id,p_encrypted_payload) RETURNING * INTO request;
  INSERT INTO public.deletion_media(bucket_id,name,request_id,object_id)
    SELECT bucket_id,name,request.id,id FROM storage.objects WHERE owner=p_user_id OR owner_id=p_user_id::text ON CONFLICT(bucket_id,name) DO NOTHING;
  UPDATE public.profiles SET deleted_at=request.requested_at,email_digest_enabled=false,dm_privacy='nobody',
    fullname=NULL,headline=NULL,bio=NULL,phone=NULL,contact_email=NULL,location=NULL,avatar_url=NULL,header_url=NULL,
    freelancer_skills=NULL,freelancer_rate=NULL,freelancer_availability=NULL,website=NULL WHERE id=p_user_id;
  DELETE FROM public.notifications WHERE recipient_id=p_user_id OR actor_id=p_user_id;
  FOR actor IN SELECT * FROM public.actors WHERE user_id=p_user_id AND NOT is_remote LOOP
    DELETE FROM public.federation_queue_partitioned WHERE actor_id=actor.id;
    IF actor.public_key IS NOT NULL THEN
      INSERT INTO public.federation_queue_partitioned(actor_id,activity,status,partition_key,priority)
      VALUES(actor.id,jsonb_build_object('type','Delete','delete_actor',true,'activity_id',gen_random_uuid()),'pending',public.actor_id_to_partition_key(actor.id),1);
    END IF;
    UPDATE public.actors SET status='disabled' WHERE id=actor.id;
  END LOOP;
  RETURN request;
END $$;
REVOKE ALL ON FUNCTION public.schedule_account_deletion(uuid,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_account_deletion(uuid,timestamptz,text) TO service_role;

CREATE FUNCTION public.claim_deletion_requests(p_limit integer DEFAULT 5)
RETURNS SETOF public.deletion_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
  RETURN QUERY UPDATE public.deletion_requests SET state='processing',lease_id=gen_random_uuid(),claimed_at=now(),attempts=attempts+1
    WHERE id IN (SELECT id FROM public.deletion_requests WHERE purge_after<=now()
      AND ((state='pending' AND (last_error IS NULL OR claimed_at<now()-interval '5 minutes'))
        OR (state='processing' AND claimed_at<now()-interval '10 minutes'))
      ORDER BY claimed_at NULLS FIRST,purge_after,id LIMIT p_limit FOR UPDATE SKIP LOCKED)
    RETURNING *;
END $$;
CREATE FUNCTION public.finish_content_deletion(p_request_id uuid,p_lease_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE request public.deletion_requests;
BEGIN
  SELECT * INTO STRICT request FROM public.deletion_requests WHERE id=p_request_id AND lease_id=p_lease_id AND state='processing' AND purge_after<=now() FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.deletion_media WHERE request_id=request.id) THEN RAISE EXCEPTION 'Media purge is incomplete'; END IF;
  IF request.kind='post' THEN DELETE FROM public.ap_objects WHERE id=request.subject_id AND deleted_at IS NOT NULL;
  ELSIF request.kind='article' THEN DELETE FROM public.articles WHERE id=request.subject_id AND deleted_at IS NOT NULL;
  ELSIF request.kind='comment' THEN DELETE FROM public.post_replies WHERE id=request.subject_id AND deleted_at IS NOT NULL;
  ELSIF request.kind='file' THEN NULL;
  ELSE RAISE EXCEPTION 'Accounts must be purged through Auth'; END IF;
  DELETE FROM public.deletion_requests WHERE id=request.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_deletion_requests(integer),public.finish_content_deletion(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_deletion_requests(integer),public.finish_content_deletion(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.queue_local_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE row_data public.ap_objects; object_data jsonb; activity_kind text; snapshot jsonb;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.deleted_at IS NOT NULL THEN RETURN NULL; END IF;
    row_data:=OLD; activity_kind:='Delete';
  ELSIF TG_OP='UPDATE' AND OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
    row_data:=OLD; activity_kind:='Delete';
  ELSIF TG_OP='UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL OR NEW.content IS NOT DISTINCT FROM OLD.content THEN RETURN NULL; END IF;
    row_data:=NEW; activity_kind:='Update';
  ELSE row_data:=NEW; activity_kind:='Create'; END IF;
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

-- Public media must go through the deletion-aware gateway. Public Storage URLs
-- bypass row policies and cannot meet immediate hiding requirements.
INSERT INTO storage.buckets(id,name,public,file_size_limit)
  VALUES('retained-deletions','retained-deletions',false,40000000) ON CONFLICT(id) DO UPDATE SET public=false;
UPDATE storage.buckets SET public=false,file_size_limit=10485760,
  allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
WHERE id IN ('avatars','posts','articles','article-covers','article-images','company-assets');

CREATE FUNCTION public.privacy_media_is_hidden(p_bucket text,p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.deletion_media WHERE bucket_id=p_bucket AND name=p_name);
$$;
REVOKE ALL ON FUNCTION public.privacy_media_is_hidden(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.privacy_media_is_hidden(text,text) TO anon,authenticated,service_role;
CREATE POLICY "Retained files are private" ON storage.objects AS RESTRICTIVE FOR ALL TO anon,authenticated
  USING(bucket_id<>'retained-deletions' AND NOT public.privacy_media_is_hidden(bucket_id,name)
    AND public.privacy_account_is_active(coalesce(owner,nullif(owner_id,'')::uuid)))
  WITH CHECK(bucket_id<>'retained-deletions' AND NOT public.privacy_media_is_hidden(bucket_id,name)
    AND public.privacy_account_is_active(coalesce(owner,nullif(owner_id,'')::uuid)));
CREATE POLICY "Read media through its gateway" ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING(bucket_id NOT IN ('avatars','posts','articles','article-covers','article-images','company-assets'));
-- No direct SELECT: otherwise a client could mint long-lived signed URLs that bypass later hiding.

CREATE FUNCTION public.media_gateway_url(p_url text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT replace(p_url,'https://anknmcmqljejabxbeohv.supabase.co/storage/v1/object/public/',
    'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/');
$$;
REVOKE ALL ON FUNCTION public.media_gateway_url(text) FROM PUBLIC,anon,authenticated;
UPDATE public.profiles SET avatar_url=public.media_gateway_url(avatar_url),header_url=public.media_gateway_url(header_url)
  WHERE avatar_url LIKE '%/storage/v1/object/public/%' OR header_url LIKE '%/storage/v1/object/public/%';
UPDATE public.companies SET logo_url=public.media_gateway_url(logo_url),banner_url=public.media_gateway_url(banner_url)
  WHERE logo_url LIKE '%/storage/v1/object/public/%' OR banner_url LIKE '%/storage/v1/object/public/%';
UPDATE public.articles SET content=public.media_gateway_url(content),cover_image_url=public.media_gateway_url(cover_image_url)
  WHERE content LIKE '%/storage/v1/object/public/%' OR cover_image_url LIKE '%/storage/v1/object/public/%';
UPDATE public.ap_objects SET content=public.media_gateway_url(content::text)::jsonb WHERE content::text LIKE '%/storage/v1/object/public/%';
UPDATE public.events SET cover_image_url=public.media_gateway_url(cover_image_url) WHERE cover_image_url LIKE '%/storage/v1/object/public/%';
UPDATE public.starter_packs SET cover_image_url=public.media_gateway_url(cover_image_url) WHERE cover_image_url LIKE '%/storage/v1/object/public/%';

CREATE FUNCTION public.resolve_public_media(p_bucket text,p_name text,p_url text)
RETURNS TABLE(id uuid,mime_type text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT o.id,o.metadata->>'mimetype' FROM storage.objects o
  WHERE o.bucket_id=p_bucket AND o.name=p_name AND p_bucket IN ('avatars','posts','articles','article-covers','article-images','company-assets')
    AND NOT public.privacy_media_is_hidden(p_bucket,p_name)
    AND public.privacy_account_is_active(coalesce(o.owner,nullif(o.owner_id,'')::uuid))
    AND (
      EXISTS(SELECT 1 FROM public.profiles WHERE deleted_at IS NULL AND (id=o.owner OR id::text=o.owner_id) AND (avatar_url=p_url OR header_url=p_url))
      OR EXISTS(SELECT 1 FROM public.companies c WHERE is_active AND (logo_url=p_url OR banner_url=p_url)
        AND EXISTS(SELECT 1 FROM public.company_roles r WHERE r.company_id=c.id AND (r.user_id=o.owner OR r.user_id::text=o.owner_id)))
      OR EXISTS(SELECT 1 FROM public.articles WHERE deleted_at IS NULL AND published AND (user_id=o.owner OR user_id::text=o.owner_id) AND public.privacy_account_is_active(user_id)
        AND (cover_image_url=p_url OR strpos(content,p_url)>0))
      OR EXISTS(SELECT 1 FROM public.ap_objects WHERE deleted_at IS NULL AND public.privacy_actor_is_active(attributed_to)
        AND EXISTS(SELECT 1 FROM public.actors a WHERE a.id=attributed_to AND (a.user_id=o.owner OR a.user_id::text=o.owner_id))
        AND strpos(content::text,p_url)>0 AND (
          (CASE WHEN type='Create' THEN content->'object' ELSE content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
          OR (CASE WHEN type='Create' THEN content->'object' ELSE content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'))
      OR EXISTS(SELECT 1 FROM public.events WHERE cover_image_url=p_url AND (user_id=o.owner OR user_id::text=o.owner_id) AND visibility='public' AND public.privacy_account_is_active(user_id))
      OR EXISTS(SELECT 1 FROM public.starter_packs WHERE cover_image_url=p_url AND (creator_id=o.owner OR creator_id::text=o.owner_id) AND public.privacy_account_is_active(creator_id))
    );
$$;
REVOKE ALL ON FUNCTION public.resolve_public_media(text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_public_media(text,text,text) TO service_role;

CREATE FUNCTION public.resolve_private_media(p_user_id uuid,p_bucket text,p_name text)
RETURNS TABLE(id uuid,mime_type text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT o.id,o.metadata->>'mimetype' FROM storage.objects o WHERE o.bucket_id=p_bucket AND o.name=p_name
    AND p_bucket IN ('avatars','posts','articles','article-covers','article-images','company-assets')
    AND (o.owner=p_user_id OR o.owner_id=p_user_id::text) AND public.privacy_account_is_active(p_user_id)
    AND NOT public.privacy_media_is_hidden(p_bucket,p_name);
$$;
REVOKE ALL ON FUNCTION public.resolve_private_media(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_private_media(uuid,text,text) TO service_role;

CREATE FUNCTION public.schedule_file_deletion(p_user_id uuid,p_bucket text,p_name text,p_url text,p_encrypted_payload text)
RETURNS public.deletion_requests LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE asset storage.objects; request public.deletion_requests;
BEGIN
  SELECT * INTO STRICT asset FROM storage.objects WHERE bucket_id=p_bucket AND name=p_name FOR UPDATE;
  IF (asset.owner=p_user_id OR coalesce(asset.owner_id,'')=p_user_id::text) IS DISTINCT FROM true OR NOT public.privacy_account_is_active(p_user_id) THEN
    RAISE EXCEPTION 'File owner mismatch' USING ERRCODE='42501'; END IF;
  SELECT * INTO request FROM public.deletion_requests WHERE kind='file' AND subject_id=asset.id;
  IF FOUND THEN RETURN request; END IF;
  IF EXISTS(SELECT 1 FROM public.resolve_public_media(p_bucket,p_name,p_url)) THEN
    RAISE EXCEPTION 'Remove the publication reference first' USING ERRCODE='23514'; END IF;
  INSERT INTO public.deletion_requests(kind,subject_id,owner_id,encrypted_payload)
    VALUES('file',asset.id,p_user_id,p_encrypted_payload) RETURNING * INTO request;
  INSERT INTO public.deletion_media(bucket_id,name,request_id,object_id) VALUES(p_bucket,p_name,request.id,asset.id);
  RETURN request;
END $$;
REVOKE ALL ON FUNCTION public.schedule_file_deletion(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_file_deletion(uuid,text,text,text,text) TO service_role;

-- Protect server-inserted messages against a deletion racing a checked HTTP request.
CREATE FUNCTION public.reject_inactive_message_participants() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.privacy_account_is_active(NEW.sender_id) OR NOT public.privacy_account_is_active(NEW.recipient_id) THEN
    RAISE EXCEPTION 'An account is unavailable' USING ERRCODE='42501'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.reject_inactive_message_participants() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reject_inactive_message_participants BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.reject_inactive_message_participants();

CREATE TABLE public.privacy_worker_lease (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  lease_id uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.privacy_worker_lease ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.privacy_worker_lease FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.privacy_worker_lease TO service_role;
CREATE FUNCTION public.claim_privacy_worker()
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE token uuid;
BEGIN
  INSERT INTO public.privacy_worker_lease(singleton,lease_id,expires_at) VALUES(true,gen_random_uuid(),now()+interval '2 minutes')
  ON CONFLICT(singleton) DO UPDATE SET lease_id=EXCLUDED.lease_id,expires_at=EXCLUDED.expires_at
    WHERE public.privacy_worker_lease.expires_at<now() RETURNING lease_id INTO token;
  RETURN token;
END $$;
CREATE FUNCTION public.list_deletion_owned_files(p_owner_id uuid)
RETURNS TABLE(bucket_id text,name text) LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT bucket_id,name FROM storage.objects WHERE owner=p_owner_id OR owner_id=p_owner_id::text;
$$;
CREATE FUNCTION public.list_purge_media(p_request_id uuid)
RETURNS SETOF public.deletion_media LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT m.* FROM public.deletion_media m JOIN public.deletion_requests r ON r.id=m.request_id
  JOIN public.deletion_requests target ON target.id=p_request_id
  WHERE target.purge_after<=now() AND target.state='processing'
    AND (r.id=target.id OR (target.kind='account' AND r.owner_id=target.owner_id));
$$;
REVOKE ALL ON FUNCTION public.list_purge_media(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.list_purge_media(uuid) TO service_role;
CREATE FUNCTION public.pending_account_content(p_limit integer DEFAULT 10)
RETURNS TABLE(kind text,id uuid,owner_id uuid,updated_at timestamptz,snapshot jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  (SELECT 'post',o.id,a.user_id,o.updated_at,to_jsonb(o) FROM public.ap_objects o JOIN public.actors a ON a.id=o.attributed_to
    JOIN public.profiles p ON p.id=a.user_id WHERE p.deleted_at IS NOT NULL AND o.deleted_at IS NULL LIMIT greatest(1,least(p_limit,20)))
  UNION ALL
  (SELECT 'article',a.id,a.user_id,a.updated_at,to_jsonb(a) FROM public.articles a JOIN public.profiles p ON p.id=a.user_id
    WHERE p.deleted_at IS NOT NULL AND a.deleted_at IS NULL LIMIT greatest(1,least(p_limit,20)))
  UNION ALL
  (SELECT 'comment',r.id,r.user_id,r.updated_at,to_jsonb(r) FROM public.post_replies r JOIN public.profiles p ON p.id=r.user_id
    WHERE p.deleted_at IS NOT NULL AND r.deleted_at IS NULL LIMIT greatest(1,least(p_limit,20)));
$$;
CREATE FUNCTION public.purge_expired_private_metadata()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  DELETE FROM public.auth_request_logs WHERE id IN(SELECT id FROM public.auth_request_logs WHERE timestamp<now()-interval '1 day' LIMIT 1000);
  DELETE FROM public.federation_request_logs WHERE id IN(SELECT id FROM public.federation_request_logs WHERE timestamp<now()-interval '7 days' LIMIT 1000);
  DELETE FROM public.mfa_recovery_requests WHERE id IN(SELECT id FROM public.mfa_recovery_requests
    WHERE coalesce(handled_at,created_at)<now()-interval '30 days' LIMIT 1000);
  DELETE FROM public.federated_oauth_states WHERE expires_at<now();
  DELETE FROM public.email_verification_tokens WHERE expires_at<now()-interval '1 day';
  DELETE FROM public.password_reset_codes WHERE expires_at<now()-interval '1 day';
END $$;
REVOKE ALL ON FUNCTION public.claim_privacy_worker(),public.list_deletion_owned_files(uuid),public.pending_account_content(integer),public.purge_expired_private_metadata() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_privacy_worker(),public.list_deletion_owned_files(uuid),public.pending_account_content(integer),public.purge_expired_private_metadata() TO service_role;

CREATE OR REPLACE FUNCTION public.get_smart_suggestions(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(user_id uuid, username text, fullname text, headline text, avatar_url text, is_verified boolean, mutual_count bigint, suggestion_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM p_user_id OR NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
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
    AND public.can_view_connection_list(uc.user_id)
    AND public.can_view_connection_list(uc.connected_user_id)
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
    FROM public.profiles p
    LEFT JOIN second_degree sd ON p.id = sd.potential_id
    CROSS JOIN my_location ml
    WHERE public.privacy_account_is_active(p.id) AND p.id != p_user_id
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
  LIMIT greatest(1,least(coalesce(p_limit,12),50));
END;
$function$
;
REVOKE ALL ON FUNCTION get_smart_suggestions(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION get_smart_suggestions(uuid,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_onboarding_recommendations(p_user_id uuid, p_headline text DEFAULT ''::text, p_role text DEFAULT ''::text, p_interests text[] DEFAULT '{}'::text[], p_limit integer DEFAULT 12)
 RETURNS TABLE(user_id uuid, username text, fullname text, headline text, avatar_url text, match_score integer, match_reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (SELECT auth.uid()) IS DISTINCT FROM p_user_id OR NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
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
  FROM public.profiles p
  WHERE public.privacy_account_is_active(p.id) AND p.id != p_user_id
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
  LIMIT greatest(1,least(coalesce(p_limit,12),50));
END;
$function$
;
REVOKE ALL ON FUNCTION get_onboarding_recommendations(uuid,text,text,text[],integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION get_onboarding_recommendations(uuid,text,text,text[],integer) TO authenticated;

COMMIT;
