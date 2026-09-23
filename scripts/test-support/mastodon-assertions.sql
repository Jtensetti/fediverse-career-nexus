BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('88888888-1111-4111-8111-111111111111','native-one@example.invalid',now(),'{"preferred_username":"native_one"}'),
('88888888-2222-4222-8222-222222222222','native-two@example.invalid',now(),'{"preferred_username":"native_two"}');
INSERT INTO auth.sessions(id,user_id) VALUES('88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa','88888888-1111-4111-8111-111111111111');
INSERT INTO public.actors(id,user_id,preferred_username,status,public_key) VALUES
('88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb','88888888-1111-4111-8111-111111111111','native_one','active','test-key'),
('88888888-cccc-4ccc-8ccc-cccccccccccc','88888888-2222-4222-8222-222222222222','native_two','active','test-key');
INSERT INTO public.actors(id,preferred_username,status,is_remote,remote_actor_url) VALUES
('88888888-dddd-4ddd-8ddd-dddddddddddd','remote_native','active',true,'https://remote.example.com/users/native');
INSERT INTO public.ap_objects(id,type,attributed_to,content) VALUES
('88888888-0001-4000-8000-000000000001','Note','88888888-cccc-4ccc-8ccc-cccccccccccc','{"type":"Note","content":"Public status","to":["https://www.w3.org/ns/activitystreams#Public"]}'),
('88888888-0002-4000-8000-000000000002','Note','88888888-cccc-4ccc-8ccc-cccccccccccc','{"type":"Note","content":"Private status","to":["https://private.example.com/users/only"]}'),
('88888888-0003-4000-8000-000000000003','Note','88888888-cccc-4ccc-8ccc-cccccccccccc','{"type":"Note","content":"I will kill you","to":["https://www.w3.org/ns/activitystreams#Public"]}');
INSERT INTO public.mastodon_clients(id,name,secret_hash,redirect_uris,scopes) VALUES
('88888888-eeee-4eee-8eee-eeeeeeeeeeee','Fixture client',repeat('a',64),ARRAY['tusky://oauth'],ARRAY['read','write','follow']),
('88888888-ffff-4fff-8fff-ffffffffffff','Other client',repeat('f',64),ARRAY['https://other.example.com/callback'],ARRAY['read']);
SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM public.mastodon_statuses)=1,'public native view excludes private and moderated statuses');
SELECT public.test_rejected('SELECT * FROM public.mastodon_grants','42501');
SELECT public.test_rejected('SELECT * FROM public.mastodon_codes','42501');
SELECT public.test_rejected('SELECT * FROM public.mastodon_clients','42501');
SELECT public.test_rejected($q$SELECT public.mastodon_identity(repeat('c',64))$q$,'42501');
RESET ROLE; SET ROLE authenticated;
SELECT public.test_rejected($q$SELECT public.mastodon_write(repeat('c',64),'status','{"status":"forged"}','https://nolto.social')$q$,'42501');
SELECT public.test_rejected('SELECT * FROM public.mastodon_clients','42501');
RESET ROLE; SET ROLE service_role;
SELECT public.mastodon_issue_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee','88888888-1111-4111-8111-111111111111','88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aal1','tusky://oauth',ARRAY['read','write'],repeat('b',64),repeat('P',43));
SELECT public.test_rejected($q$SELECT public.mastodon_exchange_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee',repeat('a',64),repeat('b',64),'https://attacker.example.com',repeat('P',43),repeat('c',64))$q$,'PT400');
SELECT public.test_rejected($q$SELECT public.mastodon_exchange_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee',repeat('a',64),repeat('b',64),'tusky://oauth',repeat('Q',43),repeat('c',64))$q$,'PT400');
SELECT public.test_rejected($q$SELECT public.mastodon_exchange_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee',repeat('f',64),repeat('b',64),'tusky://oauth',repeat('P',43),repeat('c',64))$q$,'PT401');
SELECT public.test_rejected($q$SELECT public.mastodon_exchange_code('88888888-ffff-4fff-8fff-ffffffffffff',repeat('f',64),repeat('b',64),'tusky://oauth',repeat('P',43),repeat('c',64))$q$,'PT400');
SELECT public.mastodon_exchange_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee',repeat('a',64),repeat('b',64),'tusky://oauth',repeat('P',43),repeat('c',64));
SELECT public.test_rejected($q$SELECT public.mastodon_exchange_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee',repeat('a',64),repeat('b',64),'tusky://oauth',repeat('P',43),repeat('d',64))$q$,'PT400');
SELECT public.test_assert(public.mastodon_identity(repeat('c',64),'write:statuses')->>'user_id'='88888888-1111-4111-8111-111111111111','token maps to the consenting user');
SET LOCAL request.jwt.claim='{"sub":"88888888-2222-4222-8222-222222222222","role":"service_role"}';
SET LOCAL request.jwt.claim.sub='88888888-2222-4222-8222-222222222222';
SELECT public.mastodon_identity(repeat('c',64));
SELECT public.test_assert(auth.uid()='88888888-1111-4111-8111-111111111111' AND auth.jwt()->>'session_id'='88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa','legacy claims cannot override the validated grant');
INSERT INTO public.mastodon_grants(token_hash,client_id,user_id,session_id,aal,scopes) VALUES
(repeat('d',64),'88888888-eeee-4eee-8eee-eeeeeeeeeeee','88888888-1111-4111-8111-111111111111','88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aal1',ARRAY['read:accounts']);
SELECT public.test_rejected($q$SELECT public.mastodon_write(repeat('d',64),'status','{"status":"forged"}','https://nolto.social')$q$,'PT403');
INSERT INTO public.mastodon_grants(token_hash,client_id,scopes) VALUES(repeat('e',64),'88888888-eeee-4eee-8eee-eeeeeeeeeeee',ARRAY['read','write']);
SELECT public.test_rejected($q$SELECT public.mastodon_write(repeat('e',64),'status','{"status":"forged"}','https://nolto.social')$q$,'PT401');
DO $$ DECLARE first uuid; second uuid; public_id text; private_id text; moderated_id text; remote_id text; result jsonb; BEGIN
  result:=public.mastodon_write(repeat('c',64),'status',jsonb_build_object('status','Native public post','spoiler_text','Fixture warning','language','sv','key_hash',repeat('1',64),'body_hash',repeat('2',64),'user_id','88888888-2222-4222-8222-222222222222'),'https://nolto.social');
  first:=(result->>'object_id')::uuid;
  PERFORM public.test_assert(jsonb_typeof(result->'status_id')='string','new status ID is a decimal string');
  result:=public.mastodon_write(repeat('c',64),'status',jsonb_build_object('status','Native public post','language','sv','key_hash',repeat('1',64),'body_hash',repeat('2',64)),'https://nolto.social');
  second:=(result->>'object_id')::uuid;
  PERFORM public.test_assert(first=second,'retry returns the same post');
  PERFORM public.test_assert((SELECT attributed_to='88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb' AND content->>'language'='sv' FROM public.ap_objects WHERE id=first),'author derives from grant and language is retained');
  PERFORM public.test_assert((SELECT content->>'summary'='Fixture warning' AND content->>'sensitive'='true' FROM public.ap_objects WHERE id=first),'content warning survives federation');
  PERFORM public.test_rejected($q$SELECT public.mastodon_write(repeat('c',64),'status',jsonb_build_object('status','changed','key_hash',repeat('1',64),'body_hash',repeat('3',64)),'https://nolto.social')$q$,'PT409');
  SELECT id::text INTO public_id FROM public.mastodon_status_ids WHERE object_id='88888888-0001-4000-8000-000000000001';
  SELECT id::text INTO private_id FROM public.mastodon_status_ids WHERE object_id='88888888-0002-4000-8000-000000000002';
  SELECT id::text INTO moderated_id FROM public.mastodon_status_ids WHERE object_id='88888888-0003-4000-8000-000000000003';
  SELECT id::text INTO remote_id FROM public.mastodon_account_ids WHERE actor_id='88888888-dddd-4ddd-8ddd-dddddddddddd';
  PERFORM public.test_rejected(format('SELECT public.mastodon_write(repeat(''c'',64),''favourite'',%L::jsonb,''https://nolto.social'')',jsonb_build_object('id',private_id)),'PT404');
  PERFORM public.test_rejected(format('SELECT public.mastodon_write(repeat(''c'',64),''status'',%L::jsonb,''https://nolto.social'')',jsonb_build_object('id',moderated_id,'status','reply')),'PT404');
  PERFORM public.mastodon_write(repeat('c',64),'favourite',jsonb_build_object('id',public_id),'https://nolto.social');
  PERFORM public.mastodon_write(repeat('c',64),'favourite',jsonb_build_object('id',public_id),'https://nolto.social');
  PERFORM public.test_assert((SELECT count(*) FROM public.reactions WHERE target_id='88888888-0001-4000-8000-000000000001')=1,'duplicate favourite is idempotent');
  PERFORM public.test_assert((SELECT count(*) FROM public.mastodon_favourites(repeat('c',64)))=1,'own favourites are readable');
  PERFORM public.test_rejected($q$SELECT public.mastodon_favourites(repeat('d',64))$q$,'PT403');
  PERFORM public.mastodon_write(repeat('c',64),'unfavourite',jsonb_build_object('id',public_id),'https://nolto.social');
  PERFORM public.test_assert((SELECT count(*) FROM public.reactions WHERE target_id='88888888-0001-4000-8000-000000000001')=0,'unfavourite removes own reaction');
  result:=public.mastodon_write(repeat('c',64),'status',jsonb_build_object('id',public_id,'status','Native reply'),'https://nolto.social');
  PERFORM public.test_assert(EXISTS(SELECT 1 FROM public.federation_reply_links WHERE reply_id=(result->>'object_id')::uuid AND parent_id='88888888-0001-4000-8000-000000000001'),'reply uses existing thread and federation path');
  PERFORM public.mastodon_write(repeat('c',64),'follow',jsonb_build_object('id',remote_id),'https://nolto.social');
  PERFORM public.mastodon_write(repeat('c',64),'follow',jsonb_build_object('id',remote_id),'https://nolto.social');
  PERFORM public.test_assert((SELECT count(*) FROM public.federation_queue_partitioned WHERE activity->>'type'='Follow')=1,'duplicate follow delivers once');
  PERFORM public.mastodon_write(repeat('c',64),'unfollow',jsonb_build_object('id',remote_id),'https://nolto.social');
  PERFORM public.test_assert((SELECT activity->'object'->>'id' FROM public.federation_queue_partitioned WHERE activity->>'type'='Undo' AND activity->'object'->>'type'='Follow')=(SELECT activity->>'id' FROM public.federation_queue_partitioned WHERE activity->>'type'='Follow'),'Undo uses original Follow identity');
  PERFORM public.mastodon_write(repeat('c',64),'status','{"status":"I will kill you"}','https://nolto.social');
  PERFORM public.test_assert(NOT EXISTS(SELECT 1 FROM public.mastodon_statuses WHERE content->>'content'='I will kill you'),'native app cannot bypass moderation');
  PERFORM public.test_assert(NOT EXISTS(SELECT 1 FROM public.mastodon_home(repeat('c',64)) WHERE object_id IN ('88888888-0002-4000-8000-000000000002','88888888-0003-4000-8000-000000000003')),'home does not expose private or moderated posts');
END $$;
RESET ROLE;
INSERT INTO auth.mfa_factors(id,user_id,status) VALUES('88888888-0004-4000-8000-000000000004','88888888-1111-4111-8111-111111111111','verified');
SET ROLE service_role;
SELECT public.test_rejected($q$SELECT public.mastodon_identity(repeat('c',64))$q$,'PT401');
RESET ROLE; DELETE FROM auth.mfa_factors WHERE user_id='88888888-1111-4111-8111-111111111111';
UPDATE auth.sessions SET not_after=now()-interval '1 second' WHERE id='88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE service_role;
SELECT public.test_rejected($q$SELECT public.mastodon_identity(repeat('c',64))$q$,'PT401');
RESET ROLE; UPDATE auth.sessions SET not_after=NULL WHERE id='88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
INSERT INTO public.user_bans(user_id,banned_by,reason) VALUES('88888888-1111-4111-8111-111111111111','88888888-2222-4222-8222-222222222222','fixture ban');
SET ROLE service_role;
SELECT public.test_rejected($q$SELECT public.mastodon_identity(repeat('c',64))$q$,'PT401');
RESET ROLE; DELETE FROM public.user_bans WHERE user_id='88888888-1111-4111-8111-111111111111';
SET ROLE service_role;
SELECT public.test_assert(public.mastodon_rate_limit(repeat('7',64),1,300),'first request within rate limit');
SELECT public.test_assert(NOT public.mastodon_rate_limit(repeat('7',64),1,300),'rate limit enforced atomically');
SELECT public.mastodon_issue_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee','88888888-1111-4111-8111-111111111111','88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aal1','tusky://oauth',ARRAY['read'],repeat('9',64));
SELECT public.mastodon_revoke_app('88888888-1111-4111-8111-111111111111','88888888-eeee-4eee-8eee-eeeeeeeeeeee');
SELECT public.test_rejected($q$SELECT public.mastodon_identity(repeat('c',64))$q$,'PT401');
SELECT public.test_rejected($q$SELECT public.mastodon_exchange_code('88888888-eeee-4eee-8eee-eeeeeeeeeeee',repeat('a',64),repeat('9',64),'tusky://oauth',NULL,repeat('8',64))$q$,'PT400');
SELECT public.test_assert(public.mastodon_identity(repeat('e',64))->>'user_id' IS NULL,'user revocation leaves unrelated app-only grant unchanged');
RESET ROLE;
ROLLBACK;
