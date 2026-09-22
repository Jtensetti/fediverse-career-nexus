CREATE FUNCTION public.test_assert(ok boolean,description text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',description; END IF; END $$;
CREATE FUNCTION public.test_rejected(statement text,expected_code text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN IF SQLSTATE=expected_code THEN RETURN; END IF; RAISE; END;
  RAISE EXCEPTION 'Expected rejection: %',statement;
END $$;
GRANT EXECUTE ON FUNCTION public.test_assert(boolean,text),public.test_rejected(text,text) TO anon,authenticated,service_role;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('11111111-1111-4111-8111-111111111111','alice@example.invalid',now(),'{"preferred_username":"alice"}'),
('22222222-2222-4222-8222-222222222222','bob@example.invalid',now(),'{"preferred_username":"bob"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
INSERT INTO public.actors(id,user_id,preferred_username,status) VALUES
('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','alice','disabled'),
('bbbbbbbb-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','bob','disabled');
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('11111111-aaaa-4aaa-8aaa-111111111111','aaaaaaaa-1111-4111-8111-111111111111','Note','{"type":"Note","content":"Alice post","to":["https://www.w3.org/ns/activitystreams#Public"],"attachment":[{"url":"https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/alice.jpg"}]}'),
('22222222-bbbb-4bbb-8bbb-222222222222','aaaaaaaa-1111-4111-8111-111111111111','Note','{"type":"Note","content":"Alice other post","to":["https://www.w3.org/ns/activitystreams#Public"]}'),
('33333333-cccc-4ccc-8ccc-333333333333','bbbbbbbb-2222-4222-8222-222222222222','Note','{"type":"Note","content":"Bob copying a private URL","to":["https://www.w3.org/ns/activitystreams#Public"],"attachment":[{"url":"https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/articles/draft.jpg"}]}');
INSERT INTO public.articles(id,user_id,title,content,published) VALUES
('44444444-dddd-4ddd-8ddd-444444444444','11111111-1111-4111-8111-111111111111','Article title','Article body',true);
INSERT INTO public.post_replies(id,user_id,post_id,content) VALUES
('55555555-eeee-4eee-8eee-555555555555','11111111-1111-4111-8111-111111111111','22222222-bbbb-4bbb-8bbb-222222222222','Legacy comment');
INSERT INTO public.experiences(user_id,title,company,start_date) VALUES
('11111111-1111-4111-8111-111111111111','Engineer','Company','2020-01-01');
INSERT INTO storage.objects(id,bucket_id,name,owner,owner_id,metadata) VALUES
('aaaaaaaa-ffff-4fff-8fff-111111111111','posts','alice.jpg','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','{"mimetype":"image/jpeg"}'),
('bbbbbbbb-ffff-4fff-8fff-222222222222','articles','draft.jpg','11111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','{"mimetype":"image/jpeg"}');
SELECT public.test_assert((SELECT bool_and(NOT public) FROM storage.buckets),'no public bucket bypass');
SELECT public.test_assert((SELECT bool_and(email_digest_enabled=false) FROM public.profiles),'new accounts do not opt into digests');

SET ROLE service_role;
SELECT public.register_message_keys('11111111-1111-4111-8111-111111111111',repeat('p',100),repeat('e',100),repeat('a',40));
SELECT public.register_message_keys('22222222-2222-4222-8222-222222222222',repeat('q',100),repeat('f',100),repeat('b',40));
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('posts','alice.jpg','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/alice.jpg'))=1,'owner-published image resolves');
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('articles','draft.jpg','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/articles/draft.jpg'))=0,'another user cannot make a private upload public by linking it');
SELECT public.test_assert((SELECT count(*) FROM public.resolve_private_media('11111111-1111-4111-8111-111111111111','articles','draft.jpg'))=1,'owner can preview draft via authenticated gateway');
SELECT public.test_assert((SELECT count(*) FROM public.resolve_private_media('22222222-2222-4222-8222-222222222222','articles','draft.jpg'))=0,'other user cannot preview draft');
SELECT public.test_rejected($q$SELECT public.schedule_file_deletion('11111111-1111-4111-8111-111111111111','posts','alice.jpg',
  'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/alice.jpg','v2:retained-file')$q$,'23514');
SELECT public.test_rejected($q$SELECT public.schedule_file_deletion('22222222-2222-4222-8222-222222222222','articles','draft.jpg',
  'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/articles/draft.jpg','v2:retained-file')$q$,'42501');
SELECT public.test_rejected($q$INSERT INTO public.messages(sender_id,recipient_id,content) VALUES('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','plaintext')$q$,'23514');
INSERT INTO public.messages(id,sender_id,recipient_id,content,is_encrypted,encryption_version,encrypted_content,sender_key_fingerprint,recipient_key_fingerprint) VALUES
('66666666-aaaa-4aaa-8aaa-666666666666','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','',true,'openpgp-v1','-----BEGIN PGP MESSAGE-----'||repeat('x',100),repeat('a',40),repeat('b',40));
RESET ROLE;

SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM storage.objects)=0,'anonymous Storage SELECT cannot bypass the gateway');
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects)=3,'visible public posts remain available');
SELECT public.test_rejected('SELECT * FROM public.deletion_requests','42501');
SELECT public.test_rejected('SELECT * FROM public.message_public_keys','42501');
RESET ROLE;
SELECT set_config('test.uid','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('test.role','authenticated',false);
SELECT set_config('test.jwt','{"role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}',false);
SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.message_key_backups)=1,'only own encrypted backup is readable');
SELECT public.test_assert((SELECT count(*) FROM public.message_public_keys)=2,'verified peers can discover public message keys');
SELECT public.test_assert((SELECT count(*) FROM storage.objects)=0,'owners cannot mint long-lived signed media URLs');
SELECT public.test_rejected('SELECT * FROM public.profile_views','42501');
SELECT public.test_rejected('UPDATE public.message_public_keys SET public_key=repeat(''x'',100)','42501');
SELECT public.test_rejected('DELETE FROM public.ap_objects','42501');
SELECT public.test_rejected('UPDATE public.ap_objects SET deleted_at=now()','42501');
SELECT public.test_rejected('SELECT public.claim_deletion_requests(1)','42501');
RESET ROLE;

SET ROLE service_role;
SELECT public.schedule_content_deletion('post',id,'11111111-1111-4111-8111-111111111111',updated_at,'v2:encrypted-post',
  '[{"bucket":"posts","name":"alice.jpg"}]') FROM public.ap_objects WHERE id='11111111-aaaa-4aaa-8aaa-111111111111';
SELECT public.schedule_content_deletion('post',id,'11111111-1111-4111-8111-111111111111',updated_at,'v2:retry',
  '[]') FROM public.ap_objects WHERE id='11111111-aaaa-4aaa-8aaa-111111111111';
SELECT public.schedule_content_deletion('article',id,user_id,updated_at,'v2:encrypted-article','[]') FROM public.articles WHERE id='44444444-dddd-4ddd-8ddd-444444444444';
SELECT public.schedule_content_deletion('comment',id,user_id,updated_at,'v2:encrypted-comment','[]') FROM public.post_replies WHERE id='55555555-eeee-4eee-8eee-555555555555';
SELECT public.test_assert((SELECT count(*) FROM public.deletion_requests)=3,'repeat requests are idempotent');
SELECT public.test_assert((SELECT bool_and(purge_after=requested_at+interval '30 days') FROM public.deletion_requests),'retention is exactly 30 days');
SELECT public.test_assert((SELECT content='{"type":"Tombstone"}' FROM public.ap_objects WHERE id='11111111-aaaa-4aaa-8aaa-111111111111'),'deleted post leaves no plaintext body in primary row');
SELECT public.test_assert((SELECT content='' AND title='' FROM public.articles WHERE id='44444444-dddd-4ddd-8ddd-444444444444'),'deleted article is scrubbed');
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('posts','alice.jpg','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/alice.jpg'))=0,'hidden file fails public gateway before archival');
SELECT public.test_assert((SELECT count(*) FROM public.resolve_private_media('11111111-1111-4111-8111-111111111111','posts','alice.jpg'))=0,'owner cannot read a retained file');
SELECT public.test_assert((SELECT count(*) FROM public.claim_deletion_requests(20))=0,'worker cannot purge early');
RESET ROLE;
SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects)=2,'authenticated API hides retained post');
SELECT public.test_assert((SELECT count(*) FROM public.articles)=0,'API hides retained article');
SELECT public.test_assert((SELECT count(*) FROM public.post_replies)=0,'API hides retained comment');
RESET ROLE;

SET ROLE service_role;
SELECT public.schedule_account_deletion(id,updated_at,'v2:encrypted-profile') FROM public.profiles WHERE id='11111111-1111-4111-8111-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.resolve_private_media('11111111-1111-4111-8111-111111111111','articles','draft.jpg'))=0,'account deletion hides even unreferenced draft files');
SELECT public.test_assert(public.claim_privacy_worker() IS NOT NULL,'first worker obtains lease');
SELECT public.test_assert(public.claim_privacy_worker() IS NULL,'overlapping worker cannot purge an archive in flight');
SELECT public.purge_expired_private_metadata();
RESET ROLE;
SET ROLE authenticated;
SELECT public.test_assert(NOT public.current_session_is_active(),'previously valid JWT cannot access hidden account');
SELECT public.test_assert((SELECT count(*) FROM public.message_key_backups)=0,'hidden account cannot fetch key backup');
RESET ROLE;
SELECT set_config('test.uid','22222222-2222-4222-8222-222222222222',false);
SELECT set_config('test.jwt','{"role":"authenticated","session_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","aal":"aal1"}',false);
SET ROLE authenticated;
SELECT public.test_assert(public.current_session_is_active(),'other account remains active');
SELECT public.test_assert((SELECT count(*) FROM public.messages)=0,'peer cannot fetch hidden-account messages');
SELECT public.test_assert((SELECT count(*) FROM public.get_smart_suggestions('22222222-2222-4222-8222-222222222222',10))=0,'definer suggestions cannot bypass hiding');
RESET ROLE;
SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM public.public_profiles)=1,'public view hides account');
SELECT public.test_assert((SELECT count(*) FROM public.public_experiences)=0,'public CV view hides account');
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects)=1,'all account posts hidden before archive worker runs');
RESET ROLE;

SET ROLE service_role;
UPDATE public.deletion_requests SET requested_at=now()-interval '31 days',purge_after=now()-interval '1 day' WHERE kind='post';
SELECT public.test_assert((SELECT count(*) FROM public.claim_deletion_requests(20))=1,'due content is claimable');
DO $$ DECLARE r public.deletion_requests; BEGIN
  SELECT * INTO r FROM public.deletion_requests WHERE kind='post';
  PERFORM public.test_rejected(format('SELECT public.finish_content_deletion(%L,%L)',r.id,r.lease_id),'P0001');
END $$;
-- Emulate successful Storage deletion, then allow the database purge.
DELETE FROM storage.objects WHERE bucket_id='posts' AND name='alice.jpg';
DELETE FROM public.deletion_media WHERE bucket_id='posts' AND name='alice.jpg';
SELECT public.finish_content_deletion(id,lease_id) FROM public.deletion_requests WHERE kind='post';
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.ap_objects WHERE id='11111111-aaaa-4aaa-8aaa-111111111111'),'due content physically removed');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.deletion_requests WHERE kind='post'),'encrypted content archive removed with request');
RESET ROLE;
-- Auth deletion is exercised by the old-schema regression too; here include E2EE keys.
DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111';
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.message_key_backups WHERE user_id='11111111-1111-4111-8111-111111111111'),'Auth deletion erases the encrypted key backup');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.messages),'Auth deletion erases both sides of local conversation');
SELECT public.test_assert(NOT public.is_username_available('alice'),'deleted federation address remains reserved without profile content');

INSERT INTO storage.objects(id,bucket_id,name,owner,metadata) VALUES
('cccccccc-ffff-4fff-8fff-333333333333','company-assets','old.jpg','22222222-2222-4222-8222-222222222222','{"mimetype":"image/jpeg"}');
SET ROLE service_role;
SELECT public.schedule_file_deletion('22222222-2222-4222-8222-222222222222','company-assets','old.jpg',
  'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/company-assets/old.jpg','v2:old-file');
SELECT public.test_assert((SELECT count(*) FROM public.resolve_private_media('22222222-2222-4222-8222-222222222222','company-assets','old.jpg'))=0,'replaced company image enters private retention');
SELECT public.test_assert(EXISTS(SELECT 1 FROM public.deletion_requests WHERE kind='file' AND purge_after=requested_at+interval '30 days'),'standalone file uses the same deadline');
RESET ROLE;
