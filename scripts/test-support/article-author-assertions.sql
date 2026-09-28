-- Local/disposable database regression only. Never run against a hosted project.
DO $guard$ BEGIN
  IF current_database() NOT LIKE 'nolto_fresh_%'
    AND coalesce(current_setting('nolto.fresh_install_guard',true),'')<>'isolated-ci' THEN
    RAISE EXCEPTION 'Article-author regression requires an isolated database';
  END IF;
END $guard$;
BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('f0928b00-1000-4000-8000-000000000001','author-owner@example.invalid',now(),'{"preferred_username":"rls_author_owner"}'),
('f0928b00-1000-4000-8000-000000000002','author-member@example.invalid',now(),'{"preferred_username":"rls_author_member"}'),
('f0928b00-1000-4000-8000-000000000003','author-other@example.invalid',now(),'{"preferred_username":"rls_author_other"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('f0928b00-2000-4000-8000-000000000001','f0928b00-1000-4000-8000-000000000001'),
('f0928b00-2000-4000-8000-000000000002','f0928b00-1000-4000-8000-000000000002');
INSERT INTO public.articles(id,user_id,title,content,published) VALUES
('f0928b00-3000-4000-8000-000000000001','f0928b00-1000-4000-8000-000000000001','Private draft','Synthetic author regression',false),
('f0928b00-3000-4000-8000-000000000002','f0928b00-1000-4000-8000-000000000001','Public article','Synthetic author regression',true),
('f0928b00-3000-4000-8000-000000000003','f0928b00-1000-4000-8000-000000000003','Other draft','Synthetic author regression',false);

SELECT set_config('request.jwt.claims','{"role":"anon"}',true);
SET LOCAL ROLE anon;
DO $test$ BEGIN
  IF (SELECT count(*) FROM public.article_authors WHERE article_id IN
    ('f0928b00-3000-4000-8000-000000000001','f0928b00-3000-4000-8000-000000000002'))<>1 THEN
    RAISE EXCEPTION 'Public author visibility changed or draft authors leaked';
  END IF;
  BEGIN
    INSERT INTO public.article_authors(article_id,user_id,can_edit,is_primary) VALUES
      ('f0928b00-3000-4000-8000-000000000002','f0928b00-1000-4000-8000-000000000002',true,false);
    RAISE EXCEPTION 'Anonymous author insertion allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f0928b00-1000-4000-8000-000000000002","session_id":"f0928b00-2000-4000-8000-000000000002","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE target uuid; BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Member positive session control failed'; END IF;
  FOREACH target IN ARRAY ARRAY[
    'f0928b00-3000-4000-8000-000000000001'::uuid,
    'f0928b00-3000-4000-8000-000000000002'::uuid
  ] LOOP
    BEGIN
      INSERT INTO public.article_authors(article_id,user_id,can_edit,is_primary)
        VALUES(target,auth.uid(),true,true);
      RAISE EXCEPTION 'A reader assigned itself primary/edit membership';
    EXCEPTION WHEN insufficient_privilege THEN NULL; END;
    IF public.moderation_is_owner('article',target) THEN RAISE EXCEPTION 'Reader became moderation owner'; END IF;
  END LOOP;
END $test$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f0928b00-1000-4000-8000-000000000001","session_id":"f0928b00-2000-4000-8000-000000000001","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE n integer; BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Owner positive session control failed'; END IF;
  IF (SELECT count(*) FROM public.article_authors WHERE article_id='f0928b00-3000-4000-8000-000000000001'
    AND user_id=auth.uid() AND is_primary AND can_edit)<>1 THEN RAISE EXCEPTION 'Primary author creation failed'; END IF;
  INSERT INTO public.article_authors(article_id,user_id,can_edit,is_primary)
    VALUES('f0928b00-3000-4000-8000-000000000001',auth.uid(),true,true)
    ON CONFLICT (article_id,user_id) DO NOTHING;
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Owner primary fallback was not idempotent'; END IF;
  INSERT INTO public.article_authors(article_id,user_id,can_edit,is_primary)
    VALUES('f0928b00-3000-4000-8000-000000000001','f0928b00-1000-4000-8000-000000000002',false,false);
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Owner cannot add collaborator'; END IF;
  UPDATE public.article_authors SET can_edit=true WHERE article_id='f0928b00-3000-4000-8000-000000000001'
    AND user_id='f0928b00-1000-4000-8000-000000000002';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Owner cannot grant collaborator edit'; END IF;
  UPDATE public.article_authors SET can_edit=false WHERE article_id='f0928b00-3000-4000-8000-000000000001'
    AND user_id='f0928b00-1000-4000-8000-000000000002';
  BEGIN
    UPDATE public.article_authors SET article_id='f0928b00-3000-4000-8000-000000000003'
      WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id='f0928b00-1000-4000-8000-000000000002';
    RAISE EXCEPTION 'Owner moved membership into a foreign article';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.article_authors(article_id,user_id,can_edit,is_primary)
      VALUES('f0928b00-3000-4000-8000-000000000002','f0928b00-1000-4000-8000-000000000002',true,true);
    RAISE EXCEPTION 'A foreign primary author was created';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE public.article_authors SET is_primary=false,can_edit=false
    WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id=auth.uid();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Primary author was demoted'; END IF;
  DELETE FROM public.article_authors WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id=auth.uid();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Primary author was removed'; END IF;
END $test$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f0928b00-1000-4000-8000-000000000002","session_id":"f0928b00-2000-4000-8000-000000000002","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE n integer; BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Collaborator session failed'; END IF;
  IF (SELECT count(*) FROM public.article_authors WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id=auth.uid())<>1
    THEN RAISE EXCEPTION 'Collaborator lost own membership visibility'; END IF;
  UPDATE public.article_authors SET can_edit=true,is_primary=true
    WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id=auth.uid();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Collaborator elevated own membership'; END IF;
  UPDATE public.article_authors SET article_id='f0928b00-3000-4000-8000-000000000003'
    WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id=auth.uid();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>0 THEN RAISE EXCEPTION 'Collaborator moved own membership'; END IF;
  IF public.moderation_is_owner('article','f0928b00-3000-4000-8000-000000000001') THEN
    RAISE EXCEPTION 'Non-editor collaborator became moderation owner'; END IF;
  DELETE FROM public.article_authors WHERE article_id='f0928b00-3000-4000-8000-000000000001' AND user_id=auth.uid();
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Collaborator cannot leave'; END IF;
END $test$;
RESET ROLE;

SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f0928b00-1000-4000-8000-000000000001","session_id":"f0928b00-2000-4000-8000-000000000001","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.article_authors(article_id,user_id,can_edit,is_primary)
  VALUES('f0928b00-3000-4000-8000-000000000001','f0928b00-1000-4000-8000-000000000002',true,false);
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f0928b00-1000-4000-8000-000000000002","session_id":"f0928b00-2000-4000-8000-000000000002","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ BEGIN
  IF NOT public.moderation_is_owner('article','f0928b00-3000-4000-8000-000000000001')
    THEN RAISE EXCEPTION 'Explicitly authorized editor lost moderation ownership'; END IF;
END $test$;
RESET ROLE;
SELECT set_config('request.jwt.claims','{"role":"authenticated","sub":"f0928b00-1000-4000-8000-000000000001","session_id":"f0928b00-2000-4000-8000-000000000001","aal":"aal1"}',true);
SET LOCAL ROLE authenticated;
DO $test$ DECLARE n integer; BEGIN
  DELETE FROM public.article_authors WHERE article_id='f0928b00-3000-4000-8000-000000000001'
    AND user_id='f0928b00-1000-4000-8000-000000000002';
  GET DIAGNOSTICS n=ROW_COUNT;
  IF n<>1 THEN RAISE EXCEPTION 'Owner cannot remove collaborator'; END IF;
  IF NOT public.moderation_is_owner('article','f0928b00-3000-4000-8000-000000000001')
    THEN RAISE EXCEPTION 'Actual owner lost moderation ownership'; END IF;
END $test$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: article-author assignment, self-escalation denial, primary attribution and voluntary leave' AS result;
