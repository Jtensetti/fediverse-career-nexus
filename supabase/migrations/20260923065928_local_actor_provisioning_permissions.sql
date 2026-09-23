BEGIN;

-- create-user-actor verifies the live Auth session, MFA and email confirmation
-- before invoking this service-role-only RPC. service_role intentionally cannot
-- SELECT auth.users; repeating that Auth check here prevented all provisioning.
CREATE OR REPLACE FUNCTION public.ensure_local_actor(user_uuid uuid, new_private_key text, new_public_key text, enable_federation boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE profile public.profiles%ROWTYPE; actor_uuid uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(user_uuid::text, 0));
  SELECT * INTO STRICT profile FROM public.profiles WHERE id = user_uuid FOR UPDATE;
  IF profile.username !~ '^[a-z0-9_]{3,30}$' THEN RAISE EXCEPTION 'Choose a valid Nolto username first'; END IF;
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

COMMIT;
