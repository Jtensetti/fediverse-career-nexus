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
