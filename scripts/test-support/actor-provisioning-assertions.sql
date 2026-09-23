-- Isolated fixture assertions for run-actor-provisioning.mjs; never run in production.
BEGIN;
DO $$ BEGIN
  IF (SELECT prosecdef FROM pg_proc WHERE oid='public.ensure_local_actor(uuid,text,text,boolean)'::regprocedure) THEN
    RAISE EXCEPTION 'Provisioning unexpectedly elevated to SECURITY DEFINER';
  END IF;
  IF has_function_privilege('anon','public.ensure_local_actor(uuid,text,text,boolean)','EXECUTE') OR
     has_function_privilege('authenticated','public.ensure_local_actor(uuid,text,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Client role can provision actors directly';
  END IF;
END $$;

SET LOCAL ROLE service_role;
DO $$
DECLARE aid uuid; repeated uuid;
BEGIN
  IF has_table_privilege(current_user,'auth.users','SELECT') THEN RAISE EXCEPTION 'Fixture does not reproduce production privileges'; END IF;
  BEGIN
    PERFORM 1 FROM auth.users;
    RAISE EXCEPTION 'Auth data became service-role readable';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  aid := public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',false);
  IF NOT EXISTS(SELECT 1 FROM public.actors WHERE id=aid AND status='disabled' AND public_key IS NULL AND private_key IS NULL) THEN
    RAISE EXCEPTION 'Local-only actor was federated or given keys';
  END IF;
  repeated := public.ensure_local_actor('11111111-1111-4111-8111-111111111111','-----BEGIN PRIVATE KEY-----first','-----BEGIN PUBLIC KEY-----first',true);
  IF repeated IS DISTINCT FROM aid THEN RAISE EXCEPTION 'Provisioning replaced the actor identity'; END IF;
  PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','-----BEGIN PRIVATE KEY-----replacement','-----BEGIN PUBLIC KEY-----replacement',true);
  PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',false);
  IF NOT EXISTS(SELECT 1 FROM public.actors WHERE id=aid AND status='active' AND
      public_key='-----BEGIN PUBLIC KEY-----first' AND private_key='-----BEGIN PRIVATE KEY-----first') THEN
    RAISE EXCEPTION 'Repeated onboarding disabled the actor or rotated signing keys';
  END IF;
  IF (SELECT count(*) FROM public.actors WHERE user_id='11111111-1111-4111-8111-111111111111')<>1 THEN
    RAISE EXCEPTION 'Repeated onboarding created duplicate actors';
  END IF;
  UPDATE public.actors SET status='suspended' WHERE id=aid;
  BEGIN
    PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',true);
    RAISE EXCEPTION 'Suspended actor could re-enable federation';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'This account cannot enable federation' THEN RAISE; END IF;
  END;
END $$;

SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',false);
    RAISE EXCEPTION 'Anonymous caller could provision an actor';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'permission denied for function ensure_local_actor' THEN RAISE; END IF;
  END;
END $$;

SET LOCAL ROLE authenticated;
DO $$ BEGIN
  BEGIN
    PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',true);
    RAISE EXCEPTION 'Authenticated caller bypassed the Edge Function checks';
  EXCEPTION WHEN insufficient_privilege THEN
    IF SQLERRM <> 'permission denied for function ensure_local_actor' THEN RAISE; END IF;
  END;
END $$;
ROLLBACK;
