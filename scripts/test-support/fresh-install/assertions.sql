-- Fresh-install assertions for run-fresh-install.mjs and the disposable Supabase Docker test.
-- Throwaway database only (see guard below).
-- Fixture IDs below are synthetic and exist only inside the throwaway database.
\set ON_ERROR_STOP 1
DO $$ BEGIN
  -- Allowed only in a nolto_fresh_* throwaway database, or where the disposable-container
  -- wrapper has set the test-only marker nolto.fresh_install_guard=isolated-ci.
  IF current_database() NOT LIKE 'nolto_fresh_%'
     AND coalesce(current_setting('nolto.fresh_install_guard', true), '') <> 'isolated-ci' THEN
    RAISE EXCEPTION 'assertions refuse database % (no isolation marker)', current_database();
  END IF;
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

-- Public projections must not become a second write API after schema replay.
DO $$
DECLARE v record; r text;
BEGIN
  FOR v IN SELECT c.oid,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='v'
  LOOP
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
      IF has_table_privilege(r,v.oid,'INSERT,UPDATE,DELETE')
        OR has_any_column_privilege(r,v.oid,'INSERT,UPDATE') THEN
        RAISE EXCEPTION 'Public view % is writable by %',v.relname,r;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Synthetic fixtures only. Refuse any database outside the disposable test harness.
DO $$ BEGIN
 IF current_database() NOT LIKE 'nolto_fresh_%' AND coalesce(current_setting('nolto.fresh_install_guard',true),'') <> 'isolated-ci' THEN
  RAISE EXCEPTION 'Security regression fixtures require an isolated database';
 END IF;
END $$;
BEGIN;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
('b1000000-0000-4000-8000-000000000001','scan-owner@example.invalid','{"preferred_username":"scan_owner","fullname":"Synthetic Owner"}'),
('b1000000-0000-4000-8000-000000000002','scan-reader@example.invalid','{"preferred_username":"scan_reader","fullname":"Synthetic Reader"}');
INSERT INTO auth.sessions(id,user_id,aal) VALUES
('b1000000-0000-4000-8000-000000000003','b1000000-0000-4000-8000-000000000001','aal1');
INSERT INTO public.articles(id,user_id,title,content,published) VALUES
('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Private draft','Synthetic draft',false),
('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','Published article','Synthetic public text',true);
INSERT INTO public.article_reactions(article_id,user_id,emoji) VALUES
('b2000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002','like'),
('b2000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','like');
INSERT INTO public.skills(id,user_id,name) VALUES ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Private skill');
INSERT INTO public.profile_section_visibility(user_id,section,visibility) VALUES ('b1000000-0000-4000-8000-000000000001','skills','connections') ON CONFLICT(user_id,section) DO UPDATE SET visibility=excluded.visibility;
INSERT INTO public.skill_endorsements(skill_id,endorser_id) VALUES ('b3000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000002');
SELECT public.ensure_local_actor('b1000000-0000-4000-8000-000000000001','','',false);
INSERT INTO public.ap_objects(id,type,attributed_to,content)
SELECT id,'Note',(SELECT id FROM public.actors WHERE user_id='b1000000-0000-4000-8000-000000000001'),body::jsonb
FROM (VALUES ('b4000000-0000-4000-8000-000000000001'::uuid,'{"type":"Note","content":"Synthetic private post","to":[]}'),
('b4000000-0000-4000-8000-000000000002'::uuid,'{"type":"Note","content":"Synthetic public post","to":["https://www.w3.org/ns/activitystreams#Public"]}')) AS items(id,body);
INSERT INTO public.post_replies(id,post_id,user_id,content) VALUES
('b5000000-0000-4000-8000-000000000001','b4000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001','Private synthetic reply'),
('b5000000-0000-4000-8000-000000000002','b4000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000001','Public synthetic reply');
INSERT INTO public.reactions(target_id,target_type,user_id,reaction) VALUES
('b4000000-0000-4000-8000-000000000001','post','b1000000-0000-4000-8000-000000000002','love'),
('b4000000-0000-4000-8000-000000000002','post','b1000000-0000-4000-8000-000000000002','love'),
('b5000000-0000-4000-8000-000000000001','reply','b1000000-0000-4000-8000-000000000002','love'),
('b5000000-0000-4000-8000-000000000002','reply','b1000000-0000-4000-8000-000000000002','love');
SET LOCAL ROLE anon;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.post_replies WHERE id IN ('b5000000-0000-4000-8000-000000000001','b5000000-0000-4000-8000-000000000002')) <> 1 THEN RAISE EXCEPTION 'Private reply leaked or public reply hidden'; END IF;
 IF (SELECT count(*) FROM public.reactions WHERE user_id='b1000000-0000-4000-8000-000000000002') <> 2 THEN RAISE EXCEPTION 'Private reaction leaked or public reaction hidden'; END IF;
 IF (SELECT count(*) FROM public.article_reactions WHERE article_id IN ('b2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002')) <> 1 THEN RAISE EXCEPTION 'Draft reactions leaked or public reactions hidden'; END IF;
 IF EXISTS(SELECT 1 FROM public.article_authors WHERE article_id='b2000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Draft author leaked'; END IF;
 IF EXISTS(SELECT 1 FROM public.skill_endorsements WHERE skill_id='b3000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Private skill endorsements leaked'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"sub":"b1000000-0000-4000-8000-000000000001","session_id":"b1000000-0000-4000-8000-000000000003","role":"authenticated","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
INSERT INTO storage.objects(bucket_id,name,owner,owner_id) VALUES ('avatars','b1000000-0000-4000-8000-000000000001/test.png','b1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001');
DO $$ BEGIN
 BEGIN
  INSERT INTO storage.objects(bucket_id,name,owner,owner_id) VALUES ('avatars','b1000000-0000-4000-8000-000000000002/test.png','b1000000-0000-4000-8000-000000000001','b1000000-0000-4000-8000-000000000001');
  RAISE EXCEPTION 'Foreign avatar upload was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF (SELECT count(*) FROM public.article_reactions WHERE article_id IN ('b2000000-0000-4000-8000-000000000001','b2000000-0000-4000-8000-000000000002')) <> 2 THEN RAISE EXCEPTION 'Owner lost draft access'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.skill_endorsements WHERE skill_id='b3000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Owner lost endorsement access'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: avatar ownership and private metadata boundaries' AS result;

