-- No live users or posts are deleted by this migration. Run the separate demo cleanup explicitly.
BEGIN;

-- Abort with an actionable error rather than silently merge existing identities.
DO $$
BEGIN
  IF EXISTS (SELECT lower(username) FROM public.profiles WHERE username IS NOT NULL GROUP BY lower(username) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Duplicate case-insensitive usernames: resolve before applying the identity migration';
  END IF;
  IF EXISTS (SELECT user_id FROM public.actors WHERE user_id IS NOT NULL AND is_remote = false GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Multiple local actors for one user: reconcile identities before applying this migration';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_casefold_key ON public.profiles (lower(username));
CREATE UNIQUE INDEX IF NOT EXISTS actors_local_user_key ON public.actors (user_id) WHERE is_remote = false;

-- API column grants matter in addition to RLS: a view does not protect its base table.
REVOKE ALL ON public.actors FROM anon, authenticated;
DO $$
DECLARE columns text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO columns
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'actors' AND column_name <> 'private_key';
  EXECUTE format('GRANT SELECT (%s) ON public.actors TO anon, authenticated', columns);
END $$;
GRANT UPDATE (status, also_known_as, manually_approves_followers) ON public.actors TO authenticated;
DROP POLICY IF EXISTS "Public actor metadata" ON public.actors;
CREATE POLICY "Public actor metadata" ON public.actors FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Owners update federation preferences" ON public.actors;
CREATE POLICY "Owners update federation preferences" ON public.actors FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER VIEW public.public_actors SET (security_invoker = true);

-- Revoke the default PUBLIC grant on routines that expose signing material.
DO $$
DECLARE routine record;
BEGIN
  FOR routine IN SELECT p.oid::regprocedure AS signature FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname IN (
      'ensure_actor_keys', 'get_actor_private_key', 'get_actor_private_key_service',
      'get_server_keys', 'get_server_key', 'get_current_server_key', 'claim_federation_items', 'cleanup_federation_signature_cache',
      'create_follower_batches', 'create_follow'
    )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', routine.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', routine.signature);
  END LOOP;
END $$;
REVOKE ALL ON public.server_keys FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.ensure_actor_keys(actor_uuid uuid, new_private_key text, new_public_key text)
RETURNS TABLE(private_key text, public_key text)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE existing public.actors%ROWTYPE;
BEGIN
  SELECT * INTO STRICT existing FROM public.actors WHERE id = actor_uuid AND is_remote = false FOR UPDATE;
  IF existing.status <> 'active' THEN RAISE EXCEPTION 'Federation is disabled'; END IF;
  IF existing.private_key IS NULL OR existing.public_key IS NULL THEN
    IF new_private_key NOT LIKE '-----BEGIN PRIVATE KEY-----%' OR new_public_key NOT LIKE '-----BEGIN PUBLIC KEY-----%' THEN
      RAISE EXCEPTION 'Invalid signing key';
    END IF;
    UPDATE public.actors SET private_key = new_private_key, public_key = new_public_key, updated_at = now()
      WHERE id = actor_uuid RETURNING * INTO existing;
  END IF;
  RETURN QUERY SELECT existing.private_key, existing.public_key;
END $$;
REVOKE ALL ON FUNCTION public.ensure_actor_keys(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_actor_keys(uuid,text,text) TO service_role;

-- Serializes initial provisioning and preserves an existing key pair across concurrent requests.
CREATE OR REPLACE FUNCTION public.ensure_local_actor(user_uuid uuid, new_private_key text, new_public_key text, enable_federation boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE profile public.profiles%ROWTYPE; actor_uuid uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(user_uuid::text, 0));
  SELECT * INTO STRICT profile FROM public.profiles WHERE id = user_uuid FOR UPDATE;
  IF profile.username !~ '^[a-z0-9_]{3,30}$' THEN RAISE EXCEPTION 'Choose a valid Nolto username first'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = user_uuid AND email_confirmed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Confirm your account before enabling federation';
  END IF;
  SELECT id INTO actor_uuid FROM public.actors WHERE user_id = user_uuid AND is_remote = false;
  IF actor_uuid IS NULL THEN
    INSERT INTO public.actors (user_id, preferred_username, type, status, is_remote)
      VALUES (user_uuid, profile.username, 'Person', 'disabled', false) RETURNING id INTO actor_uuid;
  END IF;
  IF enable_federation THEN
    IF EXISTS (SELECT 1 FROM public.actors WHERE id = actor_uuid AND status NOT IN ('active', 'disabled')) THEN
      RAISE EXCEPTION 'This account cannot enable federation';
    END IF;
    UPDATE public.actors SET status = 'active' WHERE id = actor_uuid;
    PERFORM public.ensure_actor_keys(actor_uuid, new_private_key, new_public_key);
  END IF;
  RETURN actor_uuid;
END $$;
REVOKE ALL ON FUNCTION public.ensure_local_actor(uuid,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_local_actor(uuid,text,text,boolean) TO service_role;

-- A published actor ID is permanent. Changing it silently severs remote follows.
CREATE OR REPLACE FUNCTION public.protect_federated_username()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.username IS DISTINCT FROM OLD.username THEN
    IF EXISTS (SELECT 1 FROM public.actors WHERE user_id = OLD.id AND is_remote = false AND public_key IS NOT NULL) THEN
      RAISE EXCEPTION 'Your federated username is permanent; use account migration to change identity';
    END IF;
    NEW.username := lower(NEW.username);
    IF NEW.username !~ '^[a-z0-9_]{3,30}$' OR NEW.username IN ('admin','administrator','support','security','nolto','root','system','moderator') THEN
      RAISE EXCEPTION 'Username must be 3–30 lowercase letters, digits or underscores and must not be reserved';
    END IF;
    UPDATE public.actors SET preferred_username = NEW.username WHERE user_id = OLD.id AND is_remote = false;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.protect_federated_username() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_federated_username BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_federated_username();

-- Honor the chosen handle in the same transaction as signup: uniqueness is authoritative here.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE chosen text := lower(nullif(trim(NEW.raw_user_meta_data->>'preferred_username'), ''));
BEGIN
  IF chosen IS NOT NULL AND (chosen !~ '^[a-z0-9_]{3,30}$' OR chosen IN ('admin','administrator','support','security','nolto','root','system','moderator')) THEN
    RAISE EXCEPTION 'Invalid or reserved username';
  END IF;
  INSERT INTO public.profiles (id, username, fullname, created_at, updated_at)
    VALUES (NEW.id, coalesce(chosen, 'user_' || substr(replace(NEW.id::text, '-', ''), 1, 24)),
      left(NEW.raw_user_meta_data->>'fullname', 100), now(), now());
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.user_settings (user_id, theme, show_network_connections)
    VALUES (NEW.id, 'system', true) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Confirmation tokens are issued only by the email service, with a per-account cooldown.
REVOKE ALL ON public.email_verification_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.email_verification_tokens TO service_role;
CREATE FUNCTION public.request_email_verification(target_email text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE target_user uuid; new_token text := gen_random_uuid()::text;
BEGIN
  SELECT id INTO target_user FROM auth.users
    WHERE lower(email) = lower(trim(target_email)) AND email_confirmed_at IS NULL FOR UPDATE;
  IF target_user IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.email_verification_tokens
      WHERE user_id = target_user AND expires_at > now() + interval '23 hours 59 minutes')
    OR (SELECT count(*) FROM public.email_verification_tokens
      WHERE user_id = target_user AND expires_at > now() + interval '23 hours') >= 3
  THEN RETURN NULL; END IF;
  INSERT INTO public.email_verification_tokens (user_id, token, expires_at)
    VALUES (target_user, new_token, now() + interval '24 hours');
  RETURN new_token;
END $$;
REVOKE ALL ON FUNCTION public.request_email_verification(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_email_verification(text) TO service_role;

-- One-time server-side OAuth state; contents cannot be forged with base64.
CREATE TABLE public.federated_oauth_states (
  state_hash text PRIMARY KEY,
  link_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_domain text NOT NULL,
  redirect_uri text NOT NULL,
  code_verifier text NOT NULL,
  username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
ALTER TABLE public.federated_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federated_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.federated_oauth_states TO service_role;
CREATE INDEX federated_oauth_states_expiry ON public.federated_oauth_states(expires_at);

-- Remote object URLs are opaque identities, never local UUIDs extracted from a URL.
ALTER TABLE public.ap_objects ADD COLUMN IF NOT EXISTS remote_object_id text;
CREATE UNIQUE INDEX IF NOT EXISTS ap_objects_remote_object_id_key ON public.ap_objects (remote_object_id);
ALTER TABLE public.outgoing_follows ADD COLUMN IF NOT EXISTS follow_activity_id text;


-- Only local, enabled actors and explicitly public objects can appear in discovery.
CREATE VIEW public.federation_public_objects WITH (security_invoker = true) AS
SELECT o.* FROM public.ap_objects o JOIN public.actors a ON a.id = o.attributed_to
WHERE a.is_remote = false AND a.status = 'active' AND a.public_key IS NOT NULL
AND o.type IN ('Create','Note','Article','Question')
AND (CASE WHEN o.type = 'Create' THEN o.content->'object' ELSE o.content END)->>'type' IN ('Note','Article','Question')
AND ((CASE WHEN o.type = 'Create' THEN o.content->'object' ELSE o.content END)->'to' ? 'https://www.w3.org/ns/activitystreams#Public'
  OR (CASE WHEN o.type = 'Create' THEN o.content->'object' ELSE o.content END)->'cc' ? 'https://www.w3.org/ns/activitystreams#Public');
REVOKE ALL ON public.federation_public_objects FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.federation_public_objects TO service_role;
CREATE TABLE public.federation_tombstones (id uuid PRIMARY KEY, deleted_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.federation_tombstones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federation_tombstones FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.federation_tombstones TO service_role;
ALTER TABLE public.actor_followers ADD COLUMN IF NOT EXISTS follow_activity_id text;

-- Saving and enqueueing are one transaction. Never echo a remote post back into federation.
DROP TRIGGER IF EXISTS trigger_federate_deleted_post ON public.ap_objects;
CREATE OR REPLACE FUNCTION public.queue_local_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE row_data public.ap_objects%ROWTYPE; object_data jsonb; activity_kind text; payload jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN row_data := OLD; activity_kind := 'Delete';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.content IS NOT DISTINCT FROM OLD.content THEN RETURN NEW; END IF;
    row_data := NEW; activity_kind := 'Update';
  ELSE row_data := NEW; activity_kind := 'Create'; END IF;
  object_data := CASE WHEN row_data.type = 'Create' THEN row_data.content->'object' ELSE row_data.content END;
  IF row_data.type NOT IN ('Create','Note','Article','Question') OR object_data->>'type' NOT IN ('Note','Article','Question')
    OR NOT coalesce((object_data->'to' ? 'https://www.w3.org/ns/activitystreams#Public') OR (object_data->'cc' ? 'https://www.w3.org/ns/activitystreams#Public'), false)
    OR NOT EXISTS (SELECT 1 FROM public.actors WHERE id = row_data.attributed_to AND is_remote = false AND status = 'active' AND public_key IS NOT NULL)
  THEN RETURN NULL; END IF;
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.federation_tombstones (id) VALUES (row_data.id) ON CONFLICT DO NOTHING;
  END IF;
  payload := jsonb_build_object('type', activity_kind, 'needs_enrichment', true,
    'object_id', row_data.id, 'activity_id', gen_random_uuid(), 'snapshot', to_jsonb(row_data));
  INSERT INTO public.federation_queue_partitioned (actor_id, activity, status, partition_key, priority)
    VALUES (row_data.attributed_to, payload, 'pending', public.actor_id_to_partition_key(row_data.attributed_to), 5);
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.queue_local_content() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_local_content AFTER INSERT OR UPDATE OR DELETE ON public.ap_objects
  FOR EACH ROW EXECUTE FUNCTION public.queue_local_content();
REVOKE INSERT, UPDATE, DELETE ON public.federation_queue_partitioned FROM anon, authenticated;

-- Recover abandoned jobs. A later event cannot pass an earlier retry for the same actor.
CREATE INDEX federation_queue_actor_order_idx ON public.federation_queue_partitioned (actor_id, created_at, id)
  WHERE status IN ('pending', 'retry', 'processing');
CREATE OR REPLACE FUNCTION public.claim_federation_items(p_partition integer, p_limit integer DEFAULT 20)
RETURNS SETOF public.federation_queue_partitioned LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RETURN QUERY UPDATE public.federation_queue_partitioned q SET status = 'processing', processed_at = now()
  WHERE (q.id, q.partition_key) IN (
    SELECT candidate.id, candidate.partition_key FROM public.federation_queue_partitioned candidate
    WHERE candidate.partition_key = p_partition AND (
      (candidate.status IN ('pending', 'retry') AND coalesce(candidate.next_retry_at, now()) <= now()) OR
      (candidate.status = 'processing' AND candidate.processed_at < now() - interval '10 minutes'))
    AND coalesce(candidate.attempts,0) < coalesce(candidate.max_attempts,10)
    AND coalesce(candidate.scheduled_for, now()) <= now()
    AND NOT EXISTS (SELECT 1 FROM public.federation_queue_partitioned earlier
      WHERE earlier.actor_id = candidate.actor_id AND earlier.partition_key = candidate.partition_key
        AND earlier.status IN ('pending', 'retry', 'processing')
        AND (earlier.created_at, earlier.id) < (candidate.created_at, candidate.id))
    ORDER BY candidate.created_at, candidate.id LIMIT greatest(1, least(p_limit, 50)) FOR UPDATE SKIP LOCKED
  ) RETURNING q.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_federation_items(integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_federation_items(integer,integer) TO service_role;
CREATE TABLE public.federation_deliveries (
  queue_id uuid NOT NULL, inbox text NOT NULL, delivered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (queue_id, inbox)
);
ALTER TABLE public.federation_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federation_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.federation_deliveries TO service_role;
CREATE TABLE public.federation_receipts (activity_id text PRIMARY KEY, actor_url text NOT NULL, received_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.federation_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federation_receipts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.federation_receipts TO service_role;
-- Client preferences must not allow a suspended account to reactivate itself.
CREATE FUNCTION public.protect_actor_status() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF (SELECT auth.role()) = 'authenticated' AND NEW.status IS DISTINCT FROM OLD.status AND
    (OLD.status NOT IN ('active','disabled') OR NEW.status NOT IN ('active','disabled') OR NEW.public_key IS NULL) THEN
    RAISE EXCEPTION 'Federation status must be changed through account provisioning';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_actor_status BEFORE UPDATE OF status ON public.actors FOR EACH ROW EXECUTE FUNCTION public.protect_actor_status();
CREATE FUNCTION public.begin_actor_move(actor_uuid uuid, target_url text, move_activity jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE current_target text;
BEGIN
  SELECT moved_to INTO current_target FROM public.actors WHERE id = actor_uuid AND is_remote = false AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active actor'; END IF;
  IF current_target = target_url THEN RETURN; END IF;
  IF current_target IS NOT NULL THEN RAISE EXCEPTION 'A move is already in progress'; END IF;
  UPDATE public.actors SET moved_to = target_url WHERE id = actor_uuid;
  INSERT INTO public.federation_queue_partitioned (actor_id, activity, partition_key, status)
    VALUES (actor_uuid, move_activity, public.actor_id_to_partition_key(actor_uuid), 'pending');
END $$;
REVOKE ALL ON FUNCTION public.begin_actor_move(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.begin_actor_move(uuid,text,jsonb) TO service_role;
-- OAuth identities are scoped to the issuer and stable remote ID, never a peer-supplied profile URL.
CREATE TABLE public.federated_identities (
  instance_domain text NOT NULL, remote_account_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (instance_domain, remote_account_id)
);
ALTER TABLE public.federated_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.federated_identities FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.federated_identities TO service_role;
CREATE INDEX federated_identities_user_id_idx ON public.federated_identities(user_id);
COMMIT;
