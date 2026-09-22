INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('77777777-7777-4777-8777-777777777777','reviewer@example.invalid',now(),'{"preferred_username":"reviewer"}');
INSERT INTO public.user_roles(user_id,role) VALUES('77777777-7777-4777-8777-777777777777','moderator');
INSERT INTO public.content_reports(id,reporter_id,content_type,content_id,reason,created_at) VALUES
('11111111-7777-4777-8777-111111111111','22222222-2222-4222-8222-222222222222','article','11111111-8888-4888-8888-111111111111','test',now()-interval '1 day'),
('22222222-7777-4777-8777-222222222222','22222222-2222-4222-8222-222222222222','article','22222222-8888-4888-8888-222222222222','test',now());
INSERT INTO public.deletion_requests(kind,subject_id,owner_id,encrypted_payload,requested_at,purge_after) VALUES
('article','11111111-8888-4888-8888-111111111111','22222222-2222-4222-8222-222222222222','v2:reported',now(),now()+interval '30 days'),
('article','22222222-8888-4888-8888-222222222222','22222222-2222-4222-8222-222222222222','v2:unreported',now()-interval '1 day',now()+interval '29 days');
SET ROLE authenticated;
SELECT public.test_rejected($q$SELECT * FROM public.read_reported_deleted_content('11111111-7777-4777-8777-111111111111','77777777-7777-4777-8777-777777777777')$q$,'42501');
SELECT public.test_rejected('SELECT * FROM public.moderation_retention_access','42501');
SELECT public.test_rejected($q$UPDATE public.content_reports SET created_at=now()-interval '10 days'$q$,'42501');
SELECT public.test_rejected($q$UPDATE public.content_reports SET content_id='another-content-id'$q$,'42501');
SELECT public.test_rejected($q$INSERT INTO public.content_reports(reporter_id,content_type,content_id,reason,created_at)
VALUES('22222222-2222-4222-8222-222222222222','article','x','x',now()-interval '10 days')$q$,'42501');
RESET ROLE;
SET ROLE service_role;
SELECT public.test_rejected($q$SELECT * FROM public.read_reported_deleted_content('11111111-7777-4777-8777-111111111111','22222222-2222-4222-8222-222222222222')$q$,'42501');
SELECT public.test_rejected($q$SELECT * FROM public.read_reported_deleted_content('11111111-7777-4777-8777-111111111111',NULL)$q$,'42501');
SELECT public.test_assert((SELECT count(*) FROM public.read_reported_deleted_content('11111111-7777-4777-8777-111111111111','77777777-7777-4777-8777-777777777777'))=1,'moderator can review previously reported text');
SELECT public.test_assert((SELECT count(*) FROM public.moderation_retention_access)=1,'each archive read is audited');
SELECT public.test_assert((SELECT count(*) FROM public.read_reported_deleted_content('22222222-7777-4777-8777-222222222222','77777777-7777-4777-8777-777777777777'))=0,'reporting after deletion does not unlock text');
UPDATE public.content_reports SET status='resolved' WHERE id='11111111-7777-4777-8777-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.read_reported_deleted_content('11111111-7777-4777-8777-111111111111','77777777-7777-4777-8777-777777777777'))=0,'closed reports cannot read retained text');
UPDATE public.content_reports SET status='pending' WHERE id='11111111-7777-4777-8777-111111111111';
UPDATE public.deletion_requests SET purge_after=requested_at WHERE subject_id='11111111-8888-4888-8888-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.read_reported_deleted_content('11111111-7777-4777-8777-111111111111','77777777-7777-4777-8777-777777777777'))=0,'expired text is inaccessible even if purge worker is late');
DELETE FROM public.deletion_requests WHERE subject_id='11111111-8888-4888-8888-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.moderation_retention_access)=0,'purge removes the linked access records');
RESET ROLE;
