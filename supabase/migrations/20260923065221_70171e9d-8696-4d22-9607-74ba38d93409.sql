BEGIN;
-- Native clients receive opaque, scoped capabilities, never a Supabase JWT.
CREATE TABLE public.mastodon_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 100),
  website text,
  secret_hash text NOT NULL CHECK(secret_hash ~ '^[0-9a-f]{64}$'),
  redirect_uris text[] NOT NULL CHECK(cardinality(redirect_uris) BETWEEN 1 AND 10),
  scopes text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.mastodon_codes (
  code_hash text PRIMARY KEY CHECK(code_hash ~ '^[0-9a-f]{64}$'),
  client_id uuid NOT NULL REFERENCES public.mastodon_clients ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  session_id uuid NOT NULL,
  aal text NOT NULL CHECK(aal IN ('aal1','aal2')),
  redirect_uri text NOT NULL,
  scopes text[] NOT NULL,
  challenge text,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
  consumed_at timestamptz
);
CREATE INDEX mastodon_codes_expiry_idx ON public.mastodon_codes(expires_at);
CREATE INDEX mastodon_codes_client_idx ON public.mastodon_codes(client_id);
CREATE INDEX mastodon_codes_user_idx ON public.mastodon_codes(user_id);
CREATE TABLE public.mastodon_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL CHECK(token_hash ~ '^[0-9a-f]{64}$'),
  client_id uuid NOT NULL REFERENCES public.mastodon_clients ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  session_id uuid,
  aal text CHECK(aal IN ('aal1','aal2')),
  scopes text[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days',
  revoked_at timestamptz,
  CHECK((user_id IS NULL AND session_id IS NULL AND aal IS NULL) OR
        (user_id IS NOT NULL AND session_id IS NOT NULL AND aal IS NOT NULL))
);
CREATE INDEX mastodon_grants_user_idx ON public.mastodon_grants(user_id,created_at DESC);
CREATE INDEX mastodon_grants_client_idx ON public.mastodon_grants(client_id);
CREATE INDEX mastodon_grants_expiry_idx ON public.mastodon_grants(expires_at);
CREATE TABLE public.mastodon_rate_limits (
  key_hash text NOT NULL CHECK(key_hash ~ '^[0-9a-f]{64}$'),
  window_start timestamptz NOT NULL,
  requests integer NOT NULL DEFAULT 1,
  PRIMARY KEY(key_hash,window_start)
);
CREATE INDEX mastodon_rate_expiry_idx ON public.mastodon_rate_limits(window_start);
CREATE TABLE public.mastodon_status_requests (
  client_id uuid NOT NULL REFERENCES public.mastodon_clients ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  key_hash text NOT NULL CHECK(key_hash ~ '^[0-9a-f]{64}$'),
  body_hash text NOT NULL CHECK(body_hash ~ '^[0-9a-f]{64}$'),
  object_id uuid NOT NULL REFERENCES public.ap_objects ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day',
  PRIMARY KEY(client_id,user_id,key_hash)
);
CREATE INDEX mastodon_requests_user_idx ON public.mastodon_status_requests(user_id);
CREATE INDEX mastodon_requests_object_idx ON public.mastodon_status_requests(object_id);
CREATE INDEX mastodon_requests_expiry_idx ON public.mastodon_status_requests(expires_at);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['mastodon_clients','mastodon_codes','mastodon_grants','mastodon_rate_limits','mastodon_status_requests'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;

-- Stable decimal IDs keep clients which parse IDs as int64 compatible.
CREATE TABLE public.mastodon_account_ids (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid UNIQUE NOT NULL REFERENCES public.actors ON DELETE CASCADE
);
CREATE TABLE public.mastodon_status_ids (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  object_id uuid UNIQUE NOT NULL REFERENCES public.ap_objects ON DELETE CASCADE
);
ALTER TABLE public.mastodon_account_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastodon_status_ids ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mastodon_account_ids,public.mastodon_status_ids FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.mastodon_account_ids,public.mastodon_status_ids TO anon,authenticated;
GRANT ALL ON public.mastodon_account_ids,public.mastodon_status_ids TO service_role;
GRANT USAGE,SELECT ON SEQUENCE public.mastodon_account_ids_id_seq,public.mastodon_status_ids_id_seq TO service_role;
CREATE POLICY "Visible account IDs" ON public.mastodon_account_ids FOR SELECT TO anon,authenticated
  USING(EXISTS(SELECT 1 FROM public.public_actors a WHERE a.id=actor_id AND a.status='active' AND public.privacy_actor_is_active(a.id)));
CREATE POLICY "Visible status IDs" ON public.mastodon_status_ids FOR SELECT TO anon,authenticated
  USING(EXISTS(SELECT 1 FROM public.ap_objects o WHERE o.id=object_id));
INSERT INTO public.mastodon_account_ids(actor_id) SELECT id FROM public.actors ORDER BY created_at,id;
INSERT INTO public.mastodon_status_ids(object_id) SELECT id FROM public.ap_objects ORDER BY created_at,id;
CREATE FUNCTION public.assign_mastodon_id() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF TG_TABLE_NAME='actors' THEN INSERT INTO public.mastodon_account_ids(actor_id) VALUES(NEW.id);
  ELSIF TG_TABLE_NAME='ap_objects' THEN INSERT INTO public.mastodon_status_ids(object_id) VALUES(NEW.id);
  END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.assign_mastodon_id() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER mastodon_account_id AFTER INSERT ON public.actors FOR EACH ROW EXECUTE FUNCTION public.assign_mastodon_id();
CREATE TRIGGER mastodon_status_id AFTER INSERT ON public.ap_objects FOR EACH ROW EXECUTE FUNCTION public.assign_mastodon_id();

CREATE VIEW public.mastodon_accounts WITH (security_invoker=true) AS
SELECT m.id::text AS id,a.id AS actor_id,a.user_id,a.preferred_username,a.is_remote,a.remote_actor_url,
  a.created_at,a.follower_count,a.following_count,p.fullname,p.bio,p.avatar_url,p.header_url
FROM public.mastodon_account_ids m JOIN public.public_actors a ON a.id=m.actor_id
LEFT JOIN public.public_profiles p ON p.id=a.user_id
WHERE a.status='active' AND public.privacy_actor_is_active(a.id);
CREATE VIEW public.mastodon_statuses WITH (security_invoker=true) AS
SELECT m.id::text AS id,m.id AS sort_id,o.id AS object_id,am.id::text AS account_id,o.attributed_to,
  o.content,o.type,o.content_warning,o.created_at,o.updated_at,o.published_at,o.remote_object_id
FROM public.mastodon_status_ids m JOIN public.ap_objects o ON o.id=m.object_id
JOIN public.mastodon_account_ids am ON am.actor_id=o.attributed_to
JOIN public.public_actors a ON a.id=o.attributed_to
WHERE o.deleted_at IS NULL AND o.moderation_status='published' AND a.status='active'
  AND public.privacy_actor_is_active(a.id) AND o.type IN ('Note','Create')
  AND coalesce((CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
    OR (CASE WHEN o.type='Create' THEN o.content->'object' ELSE o.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public',false);
REVOKE ALL ON public.mastodon_accounts,public.mastodon_statuses FROM PUBLIC;
GRANT SELECT ON public.mastodon_accounts,public.mastodon_statuses TO anon,authenticated,service_role;

CREATE FUNCTION public.mastodon_has_scope(p_scopes text[],p_required text)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT p_required IS NULL OR p_required=ANY(p_scopes) OR split_part(p_required,':',1)=ANY(p_scopes)
    OR (p_required IN ('read:follows','write:follows') AND 'follow'=ANY(p_scopes));
$$;
CREATE FUNCTION public.mastodon_check_session(p_user_id uuid,p_session_id uuid,p_aal text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  -- Trusted consent/grant only. Transaction-local claims, no JWT minted.
  -- Clear legacy GUCs which otherwise take precedence in the hosted Auth helpers.
  PERFORM set_config('request.jwt.claim','',true);
  PERFORM set_config('request.jwt.claim.sub',p_user_id::text,true);
  PERFORM set_config('request.jwt.claim.role','authenticated',true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',p_user_id,'session_id',p_session_id,'aal',p_aal,'role','authenticated')::text,true);
  IF NOT public.current_session_is_verified() THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE='Session expired, revoked or requires MFA. Connect the app again.';
  END IF;
END $$;
CREATE FUNCTION public.mastodon_identity(p_hash text,p_scope text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE g public.mastodon_grants; a uuid;
BEGIN
  SELECT * INTO g FROM public.mastodon_grants WHERE token_hash=p_hash AND revoked_at IS NULL AND expires_at>now();
  IF g.id IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE='Invalid access token'; END IF;
  IF NOT public.mastodon_has_scope(g.scopes,p_scope) THEN RAISE SQLSTATE 'PT403' USING MESSAGE='Insufficient scope'; END IF;
  IF g.user_id IS NOT NULL THEN
    PERFORM public.mastodon_check_session(g.user_id,g.session_id,g.aal);
    SELECT id INTO a FROM public.actors WHERE user_id=g.user_id AND NOT is_remote AND status='active';
    IF a IS NULL THEN RAISE SQLSTATE 'PT403' USING MESSAGE='Local account unavailable'; END IF;
  END IF;
  RETURN jsonb_build_object('id',g.id,'client_id',g.client_id,'user_id',g.user_id,'actor_id',a,'scopes',g.scopes);
END $$;
CREATE FUNCTION public.mastodon_issue_code(p_client uuid,p_user uuid,p_session uuid,p_aal text,p_redirect text,p_scopes text[],p_hash text,p_challenge text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.mastodon_clients;
BEGIN
  PERFORM public.mastodon_check_session(p_user,p_session,p_aal);
  SELECT * INTO c FROM public.mastodon_clients WHERE id=p_client;
  IF c.id IS NULL OR NOT p_redirect=ANY(c.redirect_uris) OR EXISTS(SELECT 1 FROM unnest(p_scopes) s WHERE NOT public.mastodon_has_scope(c.scopes,s)) THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE='Invalid authorization request';
  END IF;
  IF p_challenge IS NOT NULL AND p_challenge !~ '^[A-Za-z0-9_-]{43}$' THEN RAISE SQLSTATE 'PT400' USING MESSAGE='Invalid PKCE challenge'; END IF;
  INSERT INTO public.mastodon_codes(code_hash,client_id,user_id,session_id,aal,redirect_uri,scopes,challenge)
    VALUES(p_hash,p_client,p_user,p_session,p_aal,p_redirect,p_scopes,p_challenge);
END $$;
CREATE FUNCTION public.mastodon_exchange_code(p_client uuid,p_secret text,p_code text,p_redirect text,p_challenge text,p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE c public.mastodon_codes; g public.mastodon_grants;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.mastodon_clients WHERE id=p_client AND secret_hash=p_secret) THEN
    RAISE SQLSTATE 'PT401' USING MESSAGE='Invalid client credentials';
  END IF;
  SELECT * INTO c FROM public.mastodon_codes WHERE code_hash=p_code FOR UPDATE;
  IF c.code_hash IS NULL OR c.client_id<>p_client OR c.redirect_uri<>p_redirect OR c.expires_at<=now() OR c.consumed_at IS NOT NULL
    OR (c.challenge IS NOT NULL AND c.challenge IS DISTINCT FROM p_challenge) THEN
    RAISE SQLSTATE 'PT400' USING MESSAGE='Invalid or expired authorization code';
  END IF;
  PERFORM public.mastodon_check_session(c.user_id,c.session_id,c.aal);
  UPDATE public.mastodon_codes SET consumed_at=now() WHERE code_hash=c.code_hash;
  INSERT INTO public.mastodon_grants(token_hash,client_id,user_id,session_id,aal,scopes)
    VALUES(p_token,c.client_id,c.user_id,c.session_id,c.aal,c.scopes) RETURNING * INTO g;
  RETURN jsonb_build_object('scopes',g.scopes,'created_at',extract(epoch FROM g.created_at)::bigint,'expires_in',2592000);
END $$;
CREATE FUNCTION public.mastodon_rate_limit(p_key text,p_limit integer,p_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE n integer; w timestamptz;
BEGIN
  w:=to_timestamp(floor(extract(epoch FROM now())/p_seconds)*p_seconds);
  INSERT INTO public.mastodon_rate_limits(key_hash,window_start) VALUES(p_key,w)
    ON CONFLICT(key_hash,window_start) DO UPDATE SET requests=mastodon_rate_limits.requests+1 RETURNING requests INTO n;
  RETURN n<=p_limit;
END $$;

-- Service writes bypass RLS. Each operation derives ownership from the grant
-- and explicitly checks public visibility, moderation, deletion and blocks.
CREATE FUNCTION public.mastodon_write(p_hash text,p_operation text,p_payload jsonb,p_base text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE identity jsonb; actor public.actors; target public.ap_objects; target_actor public.actors;
  target_id uuid; body jsonb; object_uuid uuid; root_uuid uuid; cached public.mastodon_status_requests;
  follow_row public.outgoing_follows; activity jsonb; required_scope text;
BEGIN
  required_scope:=CASE WHEN p_operation='status' THEN 'write:statuses'
    WHEN p_operation IN ('favourite','unfavourite') THEN 'write:favourites'
    WHEN p_operation IN ('follow','unfollow') THEN 'write:follows' END;
  IF required_scope IS NULL THEN RAISE SQLSTATE 'PT422' USING MESSAGE='Unsupported operation'; END IF;
  identity:=public.mastodon_identity(p_hash,required_scope);
  IF identity->>'user_id' IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE='User authorization required'; END IF;
  SELECT * INTO actor FROM public.actors WHERE id=(identity->>'actor_id')::uuid;
  IF actor.moved_to IS NOT NULL THEN RAISE SQLSTATE 'PT403' USING MESSAGE='This account has moved'; END IF;
  IF p_base !~ '^https://[a-z0-9.-]+$' THEN RAISE SQLSTATE 'PT400' USING MESSAGE='Invalid canonical origin'; END IF;
  IF p_operation IN ('follow','unfollow') THEN
    SELECT a.* INTO target_actor FROM public.mastodon_account_ids m JOIN public.actors a ON a.id=m.actor_id
      WHERE m.id=(p_payload->>'id')::bigint AND a.status='active' AND public.privacy_actor_is_active(a.id);
    IF target_actor.id IS NULL OR target_actor.id=actor.id THEN RAISE SQLSTATE 'PT404' USING MESSAGE='Account unavailable'; END IF;
    IF target_actor.user_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_blocks
      WHERE (blocker_id=actor.user_id AND blocked_user_id=target_actor.user_id) OR (blocker_id=target_actor.user_id AND blocked_user_id=actor.user_id)) THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE='Account unavailable';
    END IF;
    IF target_actor.is_remote THEN
      IF p_operation='follow' AND (EXISTS(SELECT 1 FROM public.blocked_actors WHERE actor_url=target_actor.remote_actor_url AND status='blocked')
        OR EXISTS(SELECT 1 FROM public.blocked_domains WHERE host=lower(split_part(split_part(target_actor.remote_actor_url,'/',3),':',1)) AND status='blocked')) THEN
        RAISE SQLSTATE 'PT403' USING MESSAGE='Account blocked by this instance';
      END IF;
      IF actor.public_key IS NULL OR target_actor.remote_actor_url IS NULL THEN RAISE SQLSTATE 'PT503' USING MESSAGE='Federation identity unavailable'; END IF;
      PERFORM pg_advisory_xact_lock(hashtextextended(actor.id::text||target_actor.id::text,0));
      SELECT * INTO follow_row FROM public.outgoing_follows WHERE local_actor_id=actor.id AND remote_actor_url=target_actor.remote_actor_url;
      IF p_operation='follow' AND follow_row.id IS NULL THEN
        INSERT INTO public.outgoing_follows(local_actor_id,remote_actor_url,status,follow_activity_id)
          VALUES(actor.id,target_actor.remote_actor_url,'pending',p_base||'/functions/v1/activities/'||gen_random_uuid()) RETURNING * INTO follow_row;
        activity:=jsonb_build_object('id',follow_row.follow_activity_id,'type','Follow','actor',p_base||'/functions/v1/actor/'||actor.preferred_username,'object',target_actor.remote_actor_url,'to',jsonb_build_array(target_actor.remote_actor_url));
      ELSIF p_operation='unfollow' AND follow_row.id IS NOT NULL THEN
        activity:=jsonb_build_object('id',p_base||'/functions/v1/activities/'||gen_random_uuid(),'type','Undo','actor',p_base||'/functions/v1/actor/'||actor.preferred_username,
          'object',jsonb_build_object('id',follow_row.follow_activity_id,'type','Follow','actor',p_base||'/functions/v1/actor/'||actor.preferred_username,'object',target_actor.remote_actor_url),'to',jsonb_build_array(target_actor.remote_actor_url));
        DELETE FROM public.outgoing_follows WHERE id=follow_row.id;
      END IF;
      IF activity IS NOT NULL THEN
        INSERT INTO public.federation_queue_partitioned(actor_id,activity,status,partition_key,priority)
          VALUES(actor.id,activity,'pending',public.actor_id_to_partition_key(actor.id),5);
      END IF;
    ELSIF p_operation='follow' THEN
      INSERT INTO public.author_follows(follower_id,author_id) VALUES(actor.user_id,target_actor.user_id) ON CONFLICT DO NOTHING;
    ELSE DELETE FROM public.author_follows WHERE follower_id=actor.user_id AND author_id=target_actor.user_id;
    END IF;
    RETURN jsonb_build_object('account_id',p_payload->>'id');
  END IF;
  IF p_payload->>'id' IS NOT NULL THEN
    SELECT o.* INTO target FROM public.mastodon_status_ids m JOIN public.ap_objects o ON o.id=m.object_id
      WHERE m.id=(p_payload->>'id')::bigint;
    SELECT * INTO target_actor FROM public.actors WHERE id=target.attributed_to;
    body:=CASE WHEN target.type='Create' THEN target.content->'object' ELSE target.content END;
    IF target.id IS NULL OR target.deleted_at IS NOT NULL OR target.moderation_status<>'published'
      OR target_actor.status IS DISTINCT FROM 'active' OR NOT public.privacy_actor_is_active(target.attributed_to)
      OR coalesce(body->>'type','') NOT IN ('Note','Question')
      OR NOT coalesce(body->'to' ? 'https://www.w3.org/ns/activitystreams#Public' OR body->'cc' ? 'https://www.w3.org/ns/activitystreams#Public',false) THEN
      RAISE SQLSTATE 'PT404' USING MESSAGE='Public status unavailable';
    END IF;
    IF target_actor.user_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_blocks
      WHERE (blocker_id=actor.user_id AND blocked_user_id=target_actor.user_id) OR (blocker_id=target_actor.user_id AND blocked_user_id=actor.user_id)) THEN
      RAISE SQLSTATE 'PT403' USING MESSAGE='Status unavailable';
    END IF;
    target_id:=target.id;
  END IF;
  IF p_operation IN ('favourite','unfavourite') THEN
    IF target_id IS NULL THEN RAISE SQLSTATE 'PT404' USING MESSAGE='Status unavailable'; END IF;
    IF p_operation='favourite' THEN
      INSERT INTO public.reactions(user_id,target_id,target_type,reaction)
        VALUES(actor.user_id,target_id,CASE WHEN body->>'inReplyTo' IS NULL THEN 'post' ELSE 'reply' END,'love') ON CONFLICT DO NOTHING;
    ELSE DELETE FROM public.reactions r WHERE r.user_id=actor.user_id AND r.target_id=target.id AND r.target_type IN ('post','reply');
    END IF;
    RETURN jsonb_build_object('object_id',target_id);
  END IF;
  IF length(btrim(coalesce(p_payload->>'status',''))) NOT BETWEEN 1 AND 5000 OR length(coalesce(p_payload->>'spoiler_text',''))>500 THEN
    RAISE SQLSTATE 'PT422' USING MESSAGE='Status must contain 1 to 5000 characters';
  END IF;
  IF p_payload->>'key_hash' IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended((identity->>'client_id')||actor.user_id::text||(p_payload->>'key_hash'),0));
    SELECT * INTO cached FROM public.mastodon_status_requests WHERE client_id=(identity->>'client_id')::uuid AND user_id=actor.user_id AND key_hash=p_payload->>'key_hash' AND expires_at>now();
    IF cached.object_id IS NOT NULL THEN
      IF cached.body_hash IS DISTINCT FROM p_payload->>'body_hash' THEN RAISE SQLSTATE 'PT409' USING MESSAGE='Idempotency key already used for different content'; END IF;
      RETURN jsonb_build_object('object_id',cached.object_id,'status_id',(SELECT id::text FROM public.mastodon_status_ids WHERE object_id=cached.object_id));
    END IF;
  END IF;
  object_uuid:=gen_random_uuid();
  body:=jsonb_build_object('type','Note','content',btrim(p_payload->>'status'),'published',now(),
    'to',jsonb_build_array('https://www.w3.org/ns/activitystreams#Public'),'sensitive',coalesce((p_payload->>'sensitive')::boolean,false),'language',p_payload->>'language');
  IF coalesce(p_payload->>'spoiler_text','')<>'' THEN
    body:=body||jsonb_build_object('summary',p_payload->>'spoiler_text','sensitive',true);
  END IF;
  IF target_id IS NOT NULL THEN
    SELECT root_id INTO root_uuid FROM public.federation_reply_links WHERE reply_id=target_id;
    IF root_uuid IS NULL AND (target.content->>'rootPost') ~ '^[0-9a-f-]{36}$' THEN root_uuid:=(target.content->>'rootPost')::uuid; END IF;
    root_uuid:=coalesce(root_uuid,target_id);
    IF NOT EXISTS(SELECT 1 FROM public.mastodon_statuses WHERE object_id=root_uuid) THEN RAISE SQLSTATE 'PT404' USING MESSAGE='Thread unavailable'; END IF;
    body:=body||jsonb_build_object('inReplyTo',target_id::text,'rootPost',root_uuid::text);
  END IF;
  INSERT INTO public.ap_objects(id,type,attributed_to,content,content_warning)
    VALUES(object_uuid,'Note',actor.id,body,nullif(p_payload->>'spoiler_text',''));
  IF target_id IS NOT NULL THEN INSERT INTO public.federation_reply_links VALUES(object_uuid,target_id,root_uuid); END IF;
  IF p_payload->>'key_hash' IS NOT NULL THEN
    INSERT INTO public.mastodon_status_requests(client_id,user_id,key_hash,body_hash,object_id)
      VALUES((identity->>'client_id')::uuid,actor.user_id,p_payload->>'key_hash',p_payload->>'body_hash',object_uuid)
      ON CONFLICT(client_id,user_id,key_hash) DO UPDATE SET object_id=excluded.object_id,body_hash=excluded.body_hash,expires_at=excluded.expires_at;
  END IF;
  RETURN jsonb_build_object('object_id',object_uuid,'status_id',(SELECT id::text FROM public.mastodon_status_ids WHERE object_id=object_uuid));
END $$;

CREATE FUNCTION public.mastodon_revoke_app(p_user uuid,p_client uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  -- Delete codes first: a concurrent exchange must finish before grant revocation.
  DELETE FROM public.mastodon_codes WHERE user_id=p_user AND client_id=p_client;
  UPDATE public.mastodon_grants SET revoked_at=now() WHERE user_id=p_user AND client_id=p_client AND revoked_at IS NULL;
END $$;
CREATE FUNCTION public.mastodon_home(p_hash text,p_max bigint DEFAULT NULL,p_since bigint DEFAULT NULL,p_limit integer DEFAULT 20)
RETURNS SETOF public.mastodon_statuses LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE identity jsonb; viewer uuid; prefs public.user_feed_preferences;
BEGIN
  identity:=public.mastodon_identity(p_hash,'read:statuses'); viewer:=(identity->>'user_id')::uuid;
  IF viewer IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE='User authorization required'; END IF;
  SELECT * INTO prefs FROM public.user_feed_preferences WHERE user_id=viewer;
  RETURN QUERY SELECT s.* FROM public.mastodon_statuses s JOIN public.public_actors a ON a.id=s.attributed_to
  CROSS JOIN LATERAL (SELECT CASE WHEN s.type='Create' THEN s.content->'object' ELSE s.content END AS body) n
  WHERE (p_max IS NULL OR s.sort_id<p_max) AND (p_since IS NULL OR s.sort_id>p_since)
    AND NOT EXISTS(SELECT 1 FROM public.user_blocks WHERE (blocker_id=viewer AND blocked_user_id=a.user_id) OR (blocker_id=a.user_id AND blocked_user_id=viewer))
    AND (coalesce(prefs.show_replies,false) OR n.body->>'inReplyTo' IS NULL)
    AND NOT EXISTS(SELECT 1 FROM unnest(prefs.muted_words) w WHERE btrim(w)<>'' AND strpos(lower(regexp_replace(coalesce(n.body->>'content',''),'<[^>]*>',' ','g')),lower(w))>0)
    AND (coalesce(cardinality(prefs.language_filter),0)=0 OR lower(n.body->>'language')=ANY(prefs.language_filter))
    AND (a.user_id=viewer OR EXISTS(SELECT 1 FROM public.author_follows WHERE follower_id=viewer AND author_id=a.user_id)
      OR EXISTS(SELECT 1 FROM public.user_connections WHERE status='accepted' AND ((user_id=viewer AND connected_user_id=a.user_id) OR (connected_user_id=viewer AND user_id=a.user_id)))
      OR EXISTS(SELECT 1 FROM public.outgoing_follows WHERE local_actor_id=(identity->>'actor_id')::uuid AND status='accepted' AND remote_actor_url=a.remote_actor_url))
  ORDER BY s.sort_id DESC LIMIT greatest(1,least(coalesce(p_limit,20),40));
END $$;
CREATE FUNCTION public.mastodon_status_counts(p_ids uuid[])
RETURNS TABLE(object_id uuid,favourites_count bigint,replies_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT s.object_id,
    (SELECT count(*) FROM public.reactions r WHERE r.target_id=s.object_id AND r.target_type IN ('post','reply'))+
      (SELECT count(*) FROM public.federated_likes f WHERE f.target_id=s.object_id),
    (SELECT count(*) FROM public.mastodon_statuses r LEFT JOIN public.federation_reply_links l ON l.reply_id=r.object_id
      WHERE l.parent_id=s.object_id OR (CASE WHEN r.type='Create' THEN r.content->'object' ELSE r.content END)->>'inReplyTo'=s.object_id::text)
  FROM public.mastodon_statuses s WHERE s.object_id=ANY(p_ids[1:100]);
$$;
REVOKE ALL ON FUNCTION public.mastodon_status_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mastodon_status_counts(uuid[]) TO anon,authenticated,service_role;
CREATE FUNCTION public.mastodon_account_counts(p_ids uuid[])
RETURNS TABLE(actor_id uuid,statuses_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT s.attributed_to,count(*) FROM public.mastodon_statuses s WHERE s.attributed_to=ANY(p_ids[1:100]) GROUP BY s.attributed_to;
$$;
REVOKE ALL ON FUNCTION public.mastodon_account_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mastodon_account_counts(uuid[]) TO anon,authenticated,service_role;
CREATE FUNCTION public.mastodon_favourites(p_hash text,p_max bigint DEFAULT NULL,p_since bigint DEFAULT NULL,p_limit integer DEFAULT 20)
RETURNS SETOF public.mastodon_statuses LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE identity jsonb;
BEGIN
  identity:=public.mastodon_identity(p_hash,'read:favourites');
  IF identity->>'user_id' IS NULL THEN RAISE SQLSTATE 'PT401' USING MESSAGE='User authorization required'; END IF;
  RETURN QUERY SELECT s.* FROM public.mastodon_statuses s
    WHERE (p_max IS NULL OR s.sort_id<p_max) AND (p_since IS NULL OR s.sort_id>p_since)
      AND EXISTS(SELECT 1 FROM public.reactions r WHERE r.target_id=s.object_id AND r.target_type IN ('post','reply') AND r.user_id=(identity->>'user_id')::uuid)
    ORDER BY s.sort_id DESC LIMIT greatest(1,least(coalesce(p_limit,20),40));
END $$;
CREATE FUNCTION public.mastodon_instance_stats() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT jsonb_build_object('user_count',(SELECT count(*) FROM public.mastodon_accounts WHERE NOT is_remote),
    'status_count',(SELECT count(*) FROM public.mastodon_statuses WHERE remote_object_id IS NULL),
    'active_month',(SELECT count(DISTINCT attributed_to) FROM public.mastodon_statuses WHERE remote_object_id IS NULL AND created_at>now()-interval '30 days'),
    'domain_count',(SELECT count(DISTINCT split_part(remote_actor_url,'/',3)) FROM public.mastodon_accounts WHERE is_remote));
$$;
REVOKE ALL ON FUNCTION public.mastodon_instance_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mastodon_instance_stats() TO anon,authenticated,service_role;
CREATE FUNCTION public.purge_mastodon_metadata() RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  DELETE FROM public.mastodon_codes WHERE code_hash IN(SELECT code_hash FROM public.mastodon_codes WHERE expires_at<now() LIMIT 1000);
  DELETE FROM public.mastodon_grants WHERE id IN(SELECT id FROM public.mastodon_grants WHERE expires_at<now() OR revoked_at<now()-interval '1 day' LIMIT 1000);
  DELETE FROM public.mastodon_status_requests WHERE (client_id,user_id,key_hash) IN(SELECT client_id,user_id,key_hash FROM public.mastodon_status_requests WHERE expires_at<now() LIMIT 1000);
  DELETE FROM public.mastodon_rate_limits WHERE (key_hash,window_start) IN(SELECT key_hash,window_start FROM public.mastodon_rate_limits WHERE window_start<now()-interval '1 day' LIMIT 1000);
END $$;
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN ('mastodon_has_scope','mastodon_check_session','mastodon_identity','mastodon_issue_code','mastodon_exchange_code','mastodon_rate_limit','mastodon_write','mastodon_home','mastodon_favourites','mastodon_revoke_app','purge_mastodon_metadata') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;