BEGIN;

CREATE TABLE public.post_image_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'uploading' CHECK(state IN('uploading','ready','attached','deleting')),
  post_id uuid REFERENCES public.ap_objects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
  CHECK(storage_path=owner_id::text||'/drafts/'||id::text||'.jpg'),
  CHECK((state='attached')=(post_id IS NOT NULL))
);
CREATE INDEX post_image_owner_idx ON public.post_image_uploads(owner_id);
CREATE INDEX post_image_post_idx ON public.post_image_uploads(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX post_image_expiry_idx ON public.post_image_uploads(expires_at) WHERE state<>'attached';
ALTER TABLE public.post_image_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.post_image_uploads FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.post_image_uploads TO authenticated;
GRANT ALL ON public.post_image_uploads TO service_role;
CREATE POLICY "Own image drafts" ON public.post_image_uploads FOR SELECT TO authenticated
  USING(owner_id=(SELECT auth.uid()) AND (SELECT public.current_session_is_verified()));

CREATE FUNCTION public.begin_post_image_upload()
RETURNS TABLE(id uuid,storage_path text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE caller uuid:=auth.uid(); draft uuid:=gen_random_uuid(); path text;
BEGIN
  IF caller IS NULL OR NOT public.current_session_is_verified() OR NOT public.privacy_account_is_active(caller) THEN
    RAISE EXCEPTION 'Verified account required' USING ERRCODE='42501';
  END IF;
  -- Serialize the quota check per account, without locking unrelated uploads.
  PERFORM 1 FROM auth.users WHERE auth.users.id=caller FOR UPDATE;
  IF (SELECT count(*) FROM public.post_image_uploads WHERE owner_id=caller AND state IN('uploading','ready') AND expires_at>now())>=20 THEN
    RAISE EXCEPTION 'Too many image drafts' USING ERRCODE='23514';
  END IF;
  path:=caller::text||'/drafts/'||draft::text||'.jpg';
  INSERT INTO public.post_image_uploads(id,owner_id,storage_path) VALUES(draft,caller,path);
  RETURN QUERY SELECT draft,path;
END $$;

CREATE FUNCTION public.complete_post_image_upload(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE draft public.post_image_uploads;
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  SELECT * INTO draft FROM public.post_image_uploads WHERE id=p_id AND owner_id=auth.uid() FOR UPDATE;
  IF draft IS NULL OR draft.state NOT IN('uploading','ready') OR draft.expires_at<=now() THEN
    RAISE EXCEPTION 'Image draft unavailable' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='posts' AND name=draft.storage_path
    AND (owner=draft.owner_id OR owner_id=draft.owner_id::text)
    AND metadata->>'mimetype'='image/jpeg' AND (metadata->>'size')::bigint BETWEEN 1 AND 512000) THEN
    RAISE EXCEPTION 'Compressed image upload missing' USING ERRCODE='23514';
  END IF;
  UPDATE public.post_image_uploads SET state='ready' WHERE id=p_id;
END $$;

CREATE FUNCTION public.discard_post_image_upload(p_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  -- Row locks serialize discard/cleanup with publication. An attached image can
  -- never be deleted by a late browser cleanup or an ambiguous publish retry.
  UPDATE public.post_image_uploads SET state='deleting',expires_at=now()
    WHERE id=p_id AND owner_id=auth.uid() AND state IN('uploading','ready');
END $$;
REVOKE ALL ON FUNCTION public.begin_post_image_upload(),public.complete_post_image_upload(uuid),public.discard_post_image_upload(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.begin_post_image_upload(),public.complete_post_image_upload(uuid),public.discard_post_image_upload(uuid) TO authenticated;

UPDATE storage.buckets SET file_size_limit=512000,allowed_mime_types=ARRAY['image/jpeg'] WHERE id='posts';
CREATE POLICY "Reserved post image uploads" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK(bucket_id<>'posts' OR EXISTS(SELECT 1 FROM public.post_image_uploads d
    WHERE d.storage_path=name AND d.owner_id=(SELECT auth.uid()) AND d.state='uploading' AND d.expires_at>now()));

CREATE FUNCTION public.attach_post_image_uploads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE body jsonb; attachment jsonb; path text; draft public.post_image_uploads; local_owner uuid; paths text[]:=ARRAY[]::text[];
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN RETURN NULL; END IF;
  -- Remote documents link to their source; they never reserve local storage.
  IF EXISTS(SELECT 1 FROM public.actors WHERE id=NEW.attributed_to AND is_remote) THEN RETURN NULL; END IF;
  SELECT user_id INTO local_owner FROM public.actors WHERE id=NEW.attributed_to AND NOT is_remote;
  body:=CASE WHEN NEW.type='Create' THEN NEW.content->'object' ELSE NEW.content END;
  FOR attachment IN SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(body->'attachment')='array' THEN body->'attachment' ELSE '[]'::jsonb END) LOOP
    path:=substring(attachment->>'url' FROM '^https://[^/?#]+/functions/v1/public-media/posts/([0-9a-f-]{36}/drafts/[0-9a-f-]{36}\.jpg)$');
    IF path IS NULL THEN CONTINUE; END IF;
    SELECT * INTO draft FROM public.post_image_uploads WHERE storage_path=path FOR UPDATE;
    IF draft IS NULL OR (draft.state<>'ready' AND NOT (draft.state='attached' AND draft.post_id=NEW.id))
      OR (draft.state='ready' AND draft.expires_at<=now())
      OR NOT coalesce(draft.owner_id=local_owner OR (NEW.company_id IS NOT NULL AND public.has_company_role(draft.owner_id,NEW.company_id,ARRAY['owner','admin','editor']::public.company_role[])),false)
      OR (draft.state<>'attached' AND auth.uid() IS NOT NULL AND draft.owner_id<>auth.uid()) THEN
      RAISE EXCEPTION 'Image is not ready or belongs to another draft' USING ERRCODE='42501';
    END IF;
    paths:=array_append(paths,path);
    UPDATE public.post_image_uploads SET state='attached',post_id=NEW.id WHERE id=draft.id;
  END LOOP;
  UPDATE public.post_image_uploads SET state='deleting',post_id=NULL,expires_at=now()
    WHERE post_id=NEW.id AND NOT storage_path=ANY(paths);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.attach_post_image_uploads() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER attach_post_image_uploads AFTER INSERT OR UPDATE OF content ON public.ap_objects
  FOR EACH ROW EXECUTE FUNCTION public.attach_post_image_uploads();

CREATE FUNCTION public.claim_post_image_cleanup(p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid,storage_path text) LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  WITH expired AS (SELECT d.id FROM public.post_image_uploads d WHERE state<>'attached' AND expires_at<=now()
    ORDER BY expires_at LIMIT greatest(1,least(coalesce(p_limit,10),20)) FOR UPDATE SKIP LOCKED)
  UPDATE public.post_image_uploads d SET state='deleting',expires_at=now()+interval '5 minutes'
    FROM expired e WHERE d.id=e.id RETURNING d.id,d.storage_path;
$$;
CREATE FUNCTION public.finish_post_image_cleanup(p_id uuid)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
  DELETE FROM public.post_image_uploads WHERE id=p_id AND state='deleting';
$$;
REVOKE ALL ON FUNCTION public.claim_post_image_cleanup(integer),public.finish_post_image_cleanup(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_post_image_cleanup(integer),public.finish_post_image_cleanup(uuid) TO service_role;

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
      OR EXISTS(SELECT 1 FROM public.ap_objects ap JOIN public.companies c ON c.id=ap.company_id
        JOIN public.post_image_uploads d ON d.post_id=ap.id AND d.state='attached' AND d.storage_path=p_name
        WHERE p_bucket='posts' AND c.is_active AND ap.deleted_at IS NULL AND ap.moderation_status='published'
          AND (d.owner_id=o.owner OR d.owner_id::text=o.owner_id) AND public.privacy_account_is_active(d.owner_id)
          AND strpos(ap.content::text,p_url)>0 AND (
            (CASE WHEN ap.type='Create' THEN ap.content->'object' ELSE ap.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
            OR (CASE WHEN ap.type='Create' THEN ap.content->'object' ELSE ap.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'))
      OR EXISTS(SELECT 1 FROM public.events WHERE cover_image_url=p_url AND (user_id=o.owner OR user_id::text=o.owner_id) AND visibility='public' AND public.privacy_account_is_active(user_id))
      OR EXISTS(SELECT 1 FROM public.starter_packs WHERE cover_image_url=p_url AND (creator_id=o.owner OR creator_id::text=o.owner_id) AND public.privacy_account_is_active(creator_id))
    );
$$;

NOTIFY pgrst,'reload schema';
COMMIT;
