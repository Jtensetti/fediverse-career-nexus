BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('66666666-1111-4111-8111-111111111111','feed-reader@example.invalid',now(),'{"preferred_username":"feed_reader"}'),
('66666666-2222-4222-8222-222222222222','feed-author@example.invalid',now(),'{"preferred_username":"feed_author"}');
INSERT INTO auth.sessions(id,user_id) VALUES ('66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa','66666666-1111-4111-8111-111111111111');
INSERT INTO public.actors(id,user_id,preferred_username,status) VALUES
('66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','66666666-2222-4222-8222-222222222222','feed_author','disabled');
INSERT INTO public.ap_objects(id,attributed_to,type,content,published_at) VALUES
('66666666-0001-4000-8000-000000000001','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Note','{"type":"Note","content":"#DESIGN #räksmörgås","to":["https://www.w3.org/ns/activitystreams#Public"]}','2026-09-22T10:00:00Z'),
('66666666-0002-4000-8000-000000000002','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Create','{"type":"Create","object":{"type":"Note","content":"Metadata match","tag":[{"type":"Hashtag","name":"#Design"}],"to":["https://www.w3.org/ns/activitystreams#Public"]}}','2026-09-22T09:00:00Z'),
('66666666-0003-4000-8000-000000000003','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Note','{"type":"Note","content":"#designer <a href=\"https://example.invalid/#design\">link</a>","to":["https://www.w3.org/ns/activitystreams#Public"]}','2026-09-22T11:00:00Z'),
('66666666-0004-4000-8000-000000000004','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Note','{"type":"Note","content":"Private #design"}','2026-09-22T12:00:00Z'),
('66666666-0005-4000-8000-000000000005','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Note','{"type":"Note","content":"Deleted #design","to":["https://www.w3.org/ns/activitystreams#Public"]}','2026-09-22T13:00:00Z'),
('66666666-0006-4000-8000-000000000006','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Note','{"type":"Note","content":"Reply #design","inReplyTo":"https://example.invalid/post","to":["https://www.w3.org/ns/activitystreams#Public"]}','2026-09-22T08:00:00Z');
UPDATE public.ap_objects SET deleted_at=now() WHERE id='66666666-0005-4000-8000-000000000005';
INSERT INTO public.custom_feeds(id,user_id,name,rules) VALUES
('66666666-cccc-4ccc-8ccc-cccccccccccc','66666666-1111-4111-8111-111111111111','Design','{"include_tags":["design"]}'),
('66666666-dddd-4ddd-8ddd-dddddddddddd','66666666-2222-4222-8222-222222222222','Someone else','{"include_tags":["design"]}');
SET ROLE anon;
SELECT public.test_rejected($q$SELECT * FROM public.get_member_feed('local')$q$,'42501');
SELECT public.test_rejected('SELECT * FROM public.custom_feeds','42501');
RESET ROLE;
SET test.role='authenticated'; SET test.uid='66666666-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"66666666-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.custom_feeds)=1,'personal feed rules are visible only to the owner');
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=2,'exact hashtags match inline and Create metadata, not prefixes, URLs, deleted, private or replies');
SELECT public.test_assert((SELECT id FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc',1,1))='66666666-0002-4000-8000-000000000002','filter before pagination');
SELECT public.test_rejected($q$SELECT * FROM public.get_member_feed('66666666-dddd-4ddd-8ddd-dddddddddddd')$q$,'42501');
SELECT public.test_rejected($q$SELECT * FROM public.get_member_feed('not-a-feed')$q$,'42501');
SELECT public.test_rejected($q$UPDATE public.custom_feeds SET user_id='66666666-2222-4222-8222-222222222222' WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc'$q$,'42501');
SELECT public.test_rejected($q$UPDATE public.custom_feeds SET is_public=true WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc'$q$,'42501');
SELECT public.test_rejected($q$UPDATE public.custom_feeds SET rules='{"include_tags":123}' WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc'$q$,'23514');
UPDATE public.custom_feeds SET rules='{"include_tags":["räksmörgås"]}' WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc';
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=1,'Unicode tags');
UPDATE public.custom_feeds SET rules='{"include_tags":["not-present"],"include_users":["66666666-2222-4222-8222-222222222222"]}' WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc';
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=3,'people and tags are alternatives');
UPDATE public.custom_feeds SET rules='{"include_actors":["66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],"exclude_tags":["designer"]}' WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc';
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=2,'actor IDs and exclusions');
INSERT INTO public.user_feed_preferences(user_id,muted_words,show_replies) VALUES ('66666666-1111-4111-8111-111111111111',ARRAY['metadata'],true);
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=2,'replies and muted words are applied together before pagination');
INSERT INTO public.user_blocks(blocker_id,blocked_user_id) VALUES('66666666-1111-4111-8111-111111111111','66666666-2222-4222-8222-222222222222');
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=0,'blocked authors excluded');
DELETE FROM public.user_blocks WHERE blocker_id=auth.uid();
RESET ROLE;
INSERT INTO public.user_blocks(blocker_id,blocked_user_id) VALUES('66666666-2222-4222-8222-222222222222','66666666-1111-4111-8111-111111111111');
SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=0,'reverse blocks excluded without exposing block records');
RESET ROLE;
DELETE FROM public.user_blocks WHERE blocker_id='66666666-2222-4222-8222-222222222222';
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('66666666-0007-4000-8000-000000000007','66666666-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Announce',
'{"type":"Announce","to":["https://www.w3.org/ns/activitystreams#Public"],"object":{"type":"Note","content":"Boost #design","language":"sv"}}');
SET ROLE authenticated;
UPDATE public.user_feed_preferences SET show_reposts=false WHERE user_id=auth.uid();
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=2,'reposts can be hidden');
UPDATE public.user_feed_preferences SET show_reposts=true WHERE user_id=auth.uid();
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=3,'reposts can be included');
UPDATE public.user_feed_preferences SET language_filter=ARRAY['sv'] WHERE user_id=auth.uid();
SELECT public.test_assert((SELECT count(*) FROM public.get_member_feed('66666666-cccc-4ccc-8ccc-cccccccccccc'))=1,'language filtering precedes pagination and excludes unknown languages');
UPDATE public.user_feed_preferences SET default_feed='66666666-cccc-4ccc-8ccc-cccccccccccc' WHERE user_id=auth.uid();
DELETE FROM public.custom_feeds WHERE id='66666666-cccc-4ccc-8ccc-cccccccccccc';
SELECT public.test_assert((SELECT default_feed FROM public.user_feed_preferences WHERE user_id=auth.uid())='following','deleting the default custom feed restores following');
RESET ROLE;
ROLLBACK;
