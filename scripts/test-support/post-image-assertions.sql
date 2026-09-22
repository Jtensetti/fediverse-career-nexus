BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('66666666-1111-4111-8111-111111111111','image-owner@example.invalid',now(),'{"preferred_username":"image_owner"}'),
('66666666-2222-4222-8222-222222222222','image-other@example.invalid',now(),'{"preferred_username":"image_other"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66666666-1111-4111-8111-111111111111'),
('66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-2222-4222-8222-222222222222');
INSERT INTO public.actors(id,user_id,preferred_username,status,public_key) VALUES
('66666666-dddd-4ddd-8ddd-dddddddddddd','66666666-1111-4111-8111-111111111111','image_owner','active','test-key'),
('66666666-eeee-4eee-8eee-eeeeeeeeeeee','66666666-2222-4222-8222-222222222222','image_other','active','test-key');
CREATE TEMP TABLE image_test_drafts(id uuid,storage_path text);
GRANT SELECT,INSERT ON image_test_drafts TO authenticated,service_role;
SET test.role='authenticated'; SET test.uid='66666666-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
INSERT INTO image_test_drafts SELECT * FROM public.begin_post_image_upload();
SELECT public.test_rejected($q$SELECT public.complete_post_image_upload((SELECT id FROM image_test_drafts))$q$,'23514');
RESET ROLE;
INSERT INTO storage.objects(id,bucket_id,name,owner,owner_id,metadata) SELECT gen_random_uuid(),'posts',storage_path,
 '66666666-1111-4111-8111-111111111111','66666666-1111-4111-8111-111111111111','{"mimetype":"image/jpeg","size":512000}' FROM image_test_drafts;
SET ROLE authenticated;
SELECT public.complete_post_image_upload((SELECT id FROM image_test_drafts));
SELECT public.test_assert((SELECT count(*) FROM storage.objects WHERE name=(SELECT storage_path FROM image_test_drafts))=0,'draft is never directly publicly readable or signable');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('posts',(SELECT storage_path FROM image_test_drafts),'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/'||(SELECT storage_path FROM image_test_drafts)))=0,'unpublished image is private');
SET test.uid='66666666-2222-4222-8222-222222222222'; SET test.jwt='{"session_id":"66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.post_image_uploads)=0,'another account cannot inspect drafts');
SELECT public.test_rejected($q$INSERT INTO public.ap_objects(attributed_to,type,content) SELECT '66666666-eeee-4eee-8eee-eeeeeeeeeeee','Note',jsonb_build_object('type','Note','content','Foreign attachment','to',jsonb_build_array('https://www.w3.org/ns/activitystreams#Public'),'attachment',jsonb_build_array(jsonb_build_object('url','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/'||storage_path))) FROM image_test_drafts$q$,'42501');
SELECT public.discard_post_image_upload((SELECT id FROM image_test_drafts));
RESET ROLE;
SELECT public.test_assert((SELECT state FROM public.post_image_uploads WHERE id=(SELECT id FROM image_test_drafts))='ready','foreign discard cannot remove an image');
SET test.uid='66666666-1111-4111-8111-111111111111'; SET test.jwt='{"session_id":"66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
INSERT INTO public.ap_objects(id,attributed_to,type,content) SELECT '66666666-0001-4000-8000-000000000001','66666666-dddd-4ddd-8ddd-dddddddddddd','Note',jsonb_build_object('type','Note','content','Published image','to',jsonb_build_array('https://www.w3.org/ns/activitystreams#Public'),'attachment',jsonb_build_array(jsonb_build_object('url','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/'||storage_path))) FROM image_test_drafts;
SELECT public.discard_post_image_upload((SELECT id FROM image_test_drafts));
SELECT public.test_assert((SELECT state FROM public.post_image_uploads WHERE id=(SELECT id FROM image_test_drafts))='attached','late cleanup cannot discard a published image');
SELECT public.test_rejected($q$INSERT INTO public.ap_objects(attributed_to,type,content) SELECT attributed_to,type,content FROM public.ap_objects WHERE id='66666666-0001-4000-8000-000000000001'$q$,'42501');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('posts',(SELECT storage_path FROM image_test_drafts),'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/'||(SELECT storage_path FROM image_test_drafts)))=1,'publication atomically releases image');
UPDATE public.post_image_uploads SET expires_at=now()-interval '2 days';
SELECT public.test_assert((SELECT count(*) FROM public.claim_post_image_cleanup())=0,'expiry never collects attached files');
SET ROLE authenticated;
INSERT INTO image_test_drafts SELECT * FROM public.begin_post_image_upload();
RESET ROLE;
UPDATE public.post_image_uploads SET expires_at=now()-interval '2 days' WHERE state='uploading';
SELECT public.test_assert((SELECT count(*) FROM public.claim_post_image_cleanup())=1,'abandoned draft is claimed');
SET ROLE authenticated;
SELECT public.test_rejected($q$SELECT public.complete_post_image_upload((SELECT id FROM public.post_image_uploads WHERE state='deleting'))$q$,'42501');
SELECT public.test_rejected('SELECT * FROM public.claim_post_image_cleanup()','42501');
RESET ROLE;
SELECT public.finish_post_image_cleanup(id) FROM public.post_image_uploads WHERE state='deleting';
SELECT public.test_assert((SELECT count(*) FROM public.post_image_uploads)=1,'cleanup leaves only attached image');
ROLLBACK;
