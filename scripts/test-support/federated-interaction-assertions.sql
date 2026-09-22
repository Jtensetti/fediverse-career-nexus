BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('55555555-1111-4111-8111-111111111111','fedi-local@example.invalid',now(),'{"preferred_username":"fedi_local"}');
INSERT INTO auth.sessions(id,user_id) VALUES('55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-1111-4111-8111-111111111111');
INSERT INTO public.actors(id,user_id,preferred_username,status,public_key) VALUES
('55555555-dddd-4ddd-8ddd-dddddddddddd','55555555-1111-4111-8111-111111111111','fedi_local','active','test-key');
INSERT INTO public.actors(id,preferred_username,is_remote,remote_actor_url,status) VALUES
('55555555-eeee-4eee-8eee-eeeeeeeeeeee','fedi_remote',true,'https://remote.example.com/users/alice','active'),
('55555555-ffff-4fff-8fff-ffffffffffff','fedi_other',true,'https://other.example.com/users/bob','active');
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('55555555-0001-4000-8000-000000000001','55555555-dddd-4ddd-8ddd-dddddddddddd','Note','{"type":"Note","content":"Public target","to":["https://www.w3.org/ns/activitystreams#Public"]}');
SET ROLE service_role;
SELECT public.record_remote_like('https://remote.example.com/likes/1','55555555-eeee-4eee-8eee-eeeeeeeeeeee','55555555-0001-4000-8000-000000000001');
SELECT public.record_remote_like('https://remote.example.com/likes/1','55555555-eeee-4eee-8eee-eeeeeeeeeeee','55555555-0001-4000-8000-000000000001');
SELECT public.record_remote_like('https://remote.example.com/likes/retry','55555555-eeee-4eee-8eee-eeeeeeeeeeee','55555555-0001-4000-8000-000000000001');
SELECT public.undo_remote_interaction('https://remote.example.com/likes/1','55555555-ffff-4fff-8fff-ffffffffffff');
RESET ROLE; SET ROLE anon;
SELECT public.test_assert((SELECT like_count FROM public.get_federated_like_counts(ARRAY['55555555-0001-4000-8000-000000000001']::uuid[]))=1,'retries count once and another actor cannot undo a like');
SELECT public.test_rejected($q$SELECT public.record_remote_like('https://fake.example.com/1','55555555-eeee-4eee-8eee-eeeeeeeeeeee','55555555-0001-4000-8000-000000000001')$q$,'42501');
RESET ROLE; SET ROLE service_role;
SELECT public.undo_remote_interaction('https://remote.example.com/likes/1','55555555-eeee-4eee-8eee-eeeeeeeeeeee');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.federated_likes)=0,'matching Undo removes favourite');
INSERT INTO public.ap_objects(id,attributed_to,type,remote_object_id,content) VALUES
('55555555-0002-4000-8000-000000000002','55555555-eeee-4eee-8eee-eeeeeeeeeeee','Note','https://remote.example.com/notes/2','{"type":"Note","content":"Remote reply","inReplyTo":"https://nolto.social/functions/v1/objects/55555555-0001-4000-8000-000000000001","to":["https://www.w3.org/ns/activitystreams#Public"]}');
INSERT INTO public.federation_reply_links VALUES('55555555-0002-4000-8000-000000000002','55555555-0001-4000-8000-000000000001','55555555-0001-4000-8000-000000000001');
SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM public.get_post_replies('55555555-0001-4000-8000-000000000001'))=1,'remote URL reply appears in local thread');
SELECT public.test_assert((SELECT reply_count FROM public.get_batch_reply_counts(ARRAY['55555555-0001-4000-8000-000000000001']::uuid[]))=1,'remote URL reply count does not cast URL to UUID');
RESET ROLE;
SET test.role='authenticated'; SET test.uid='55555555-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"55555555-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.create_post_reply('55555555-0001-4000-8000-000000000001','Reply back','55555555-0002-4000-8000-000000000002');
INSERT INTO public.reactions(id,user_id,target_id,target_type,reaction) VALUES
('55555555-0003-4000-8000-000000000003',auth.uid(),'55555555-0002-4000-8000-000000000002','reply','love');
UPDATE public.reactions SET reaction='celebrate' WHERE id='55555555-0003-4000-8000-000000000003';
DELETE FROM public.reactions WHERE id='55555555-0003-4000-8000-000000000003';
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.federation_queue_partitioned WHERE activity->>'interaction'='reaction' AND activity->'snapshot'->>'reaction_id'='55555555-0003-4000-8000-000000000003')=2,'one Like and one Undo; emoji updates do not duplicate remote favourites');
SELECT public.test_assert((SELECT activity->'snapshot'->>'remote_object_id' FROM public.federation_queue_partitioned WHERE activity->>'interaction'='reaction' AND activity->>'type'='Like')='https://remote.example.com/notes/2','outgoing favourite retains the remote object address');
UPDATE public.ap_objects SET deleted_at=now() WHERE id='55555555-0001-4000-8000-000000000001';
SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM public.get_post_replies('55555555-0001-4000-8000-000000000001'))=0,'deleted parent does not expose a retained thread');
RESET ROLE;
ROLLBACK;
