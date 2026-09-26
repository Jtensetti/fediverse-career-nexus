-- Fresh-install assertions for run-fresh-install.mjs. Throwaway database only.
-- Fixture IDs below are synthetic and exist only inside the throwaway database.
\set ON_ERROR_STOP 1
DO $$ BEGIN
  IF current_database() NOT LIKE 'nolto_fresh_%' THEN RAISE EXCEPTION 'assertions refuse database %', current_database(); END IF;
END $$;

-- 1. Schema shape: every public table has RLS; key objects exist.
DO $$ DECLARE missing text; BEGIN
  SELECT string_agg(c.relname, ', ') INTO missing FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r','p') AND NOT c.relrowsecurity AND NOT c.relispartition;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Tables without RLS: %', missing; END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p')) < 90 THEN
    RAISE EXCEPTION 'Unexpectedly small public schema';
  END IF;
  PERFORM 'public.has_role(uuid,app_role)'::regprocedure, 'public.is_admin(uuid)'::regprocedure,
          'public.is_moderator(uuid)'::regprocedure, 'public.handle_new_user()'::regprocedure,
          'public.ensure_local_actor(uuid,text,text,boolean)'::regprocedure;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created') THEN
    RAISE EXCEPTION 'Auth signup trigger missing';
  END IF;
  IF (SELECT count(*) FROM storage.buckets WHERE public) > 0 THEN RAISE EXCEPTION 'A storage bucket is public'; END IF;
  IF (SELECT count(*) FROM storage.buckets WHERE id IN ('avatars','posts','articles','article-covers','article-images','company-assets','retained-deletions')) <> 7 THEN
    RAISE EXCEPTION 'Expected storage buckets missing';
  END IF;
END $$;

-- 2. Privileged helpers are not callable by client roles.
DO $$ BEGIN
  IF has_function_privilege('anon', 'public.ensure_local_actor(uuid,text,text,boolean)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.ensure_local_actor(uuid,text,text,boolean)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Client role can provision actors';
  END IF;
  IF has_table_privilege('anon', 'public.user_roles', 'INSERT') AND EXISTS (
       SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND cmd IN ('INSERT','ALL') AND 'anon' = ANY(roles)) THEN
    RAISE EXCEPTION 'Anonymous role assignment is possible';
  END IF;
END $$;

BEGIN;
-- 3. Auth signup provisions profile, default role and settings; role checks are real.
INSERT INTO auth.users (id, email, raw_user_meta_data)
  VALUES ('a0000000-0000-4000-8000-000000000001', 'fresh-install@example.invalid', '{"preferred_username":"fresh_user","fullname":"Fresh User"}');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = 'a0000000-0000-4000-8000-000000000001' AND username = 'fresh_user') THEN
    RAISE EXCEPTION 'Signup did not create the profile';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = 'a0000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Signup did not create settings';
  END IF;
  IF public.is_admin('a0000000-0000-4000-8000-000000000001') OR public.is_moderator('a0000000-0000-4000-8000-000000000001')
     OR NOT public.has_role('a0000000-0000-4000-8000-000000000001', 'user') THEN
    RAISE EXCEPTION 'New account received wrong roles';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES ('a0000000-0000-4000-8000-000000000001', 'admin');
  IF NOT public.is_admin('a0000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'is_admin ignores user_roles'; END IF;
  DELETE FROM public.user_roles WHERE user_id = 'a0000000-0000-4000-8000-000000000001' AND role = 'admin';
END $$;

-- Reserved usernames are rejected at signup.
DO $$ BEGIN
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('a0000000-0000-4000-8000-000000000002', 'r@example.invalid', '{"preferred_username":"admin"}');
  RAISE EXCEPTION 'Reserved username accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM = 'Reserved username accepted' THEN RAISE; END IF;
END $$;

-- 4. An ordinary signed-in user cannot grant themselves admin.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
DO $$ BEGIN
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES ('a0000000-0000-4000-8000-000000000001', 'admin');
    RAISE EXCEPTION 'User granted themselves admin';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

-- 5. Server-side actor provisioning for the new account.
SET LOCAL ROLE service_role;
DO $$ DECLARE aid uuid; BEGIN
  aid := public.ensure_local_actor('a0000000-0000-4000-8000-000000000001', '', '', false);
  IF NOT EXISTS (SELECT 1 FROM public.actors WHERE id = aid AND user_id = 'a0000000-0000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Actor provisioning failed';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;

SELECT 'PASS: fresh-install assertions' AS result;
