-- Reuse synthetic accounts from the preceding boundary suite.
UPDATE public.profiles SET deleted_at=NULL WHERE id='88888888-8888-4888-8888-888888888888';
INSERT INTO public.actors(id,user_id,preferred_username,status) VALUES
('99999999-bbbb-4999-8999-999999999999','99999999-9999-4999-8999-999999999999','event_guest','disabled');
INSERT INTO public.companies(id,name,slug) VALUES('77777777-cccc-4777-8777-777777777777','Test company','reply-test-company');
INSERT INTO public.company_roles(company_id,user_id,role) VALUES('77777777-cccc-4777-8777-777777777777','88888888-8888-4888-8888-888888888888','owner');
CREATE TEMP TABLE reply_test_ids(id uuid);
GRANT SELECT,INSERT ON reply_test_ids TO authenticated;
GRANT SELECT ON reply_test_ids TO anon;

SET test.role='authenticated'; SET test.uid='88888888-8888-4888-8888-888888888888';
SET test.jwt='{"session_id":"88888888-aaaa-4888-8888-888888888888","aal":"aal1"}'; SET ROLE authenticated;
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('77777777-cccc-4777-8777-777777777771','88888888-bbbb-4888-8888-888888888888','Create',
 '{"type":"Create","object":{"type":"Note","content":"Hello @event_guest and @event_guest", "to":["https://www.w3.org/ns/activitystreams#Public"]}}'),
('77777777-cccc-4777-8777-777777777772','88888888-bbbb-4888-8888-888888888888','Note',
 '{"type":"Note","content":"Private @event_guest"}'),
('77777777-cccc-4777-8777-777777777773','88888888-bbbb-4888-8888-888888888888','Note',
 '{"type":"Note","content":"Email a@event_guest.example and @event_guest@remote.example <a href=\"https://example.invalid/@event_guest\">link</a>", "to":["https://www.w3.org/ns/activitystreams#Public"]}');
SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777771','Company reply',NULL,'77777777-cccc-4777-8777-777777777777');
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects WHERE company_id='77777777-cccc-4777-8777-777777777777')=1,'authorized company reply is readable with a public audience');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777772','Do not publish a private target')$q$,'42501');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777771','   ')$q$,'23514');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777771',repeat('x',5001))$q$,'23514');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.notifications WHERE object_id='77777777-cccc-4777-8777-777777777771' AND recipient_id='99999999-9999-4999-8999-999999999999' AND type='mention' AND content IS NULL)=1,'mention is delivered once without retaining a text copy');
SELECT public.test_assert((SELECT count(*) FROM public.notifications WHERE object_id IN('77777777-cccc-4777-8777-777777777772','77777777-cccc-4777-8777-777777777773'))=0,'private posts, remote handles, emails and attributes do not create local mentions');

SET test.uid='99999999-9999-4999-8999-999999999999';
SET test.jwt='{"session_id":"99999999-aaaa-4999-8999-999999999999","aal":"aal1"}'; SET ROLE authenticated;
INSERT INTO reply_test_ids SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777771','Reply to @event_owner');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777772','Cannot read this private target')$q$,'42501');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777773','Wrong thread',(SELECT id FROM reply_test_ids))$q$,'42501');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777771','Unauthorised company',NULL,'11111111-cccc-4111-8111-111111111111')$q$,'42501');
SELECT public.test_rejected($q$INSERT INTO public.notifications(type,recipient_id,actor_id) VALUES('mention','88888888-8888-4888-8888-888888888888',auth.uid())$q$,'42501');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.notifications WHERE object_id=(SELECT id::text FROM reply_test_ids) AND type='reply' AND content IS NULL)=1,'reply notification is atomic, deduplicated against mention and contains no body');

SET test.uid='88888888-8888-4888-8888-888888888888';
SET test.jwt='{"session_id":"88888888-aaaa-4888-8888-888888888888","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects WHERE id=(SELECT id FROM reply_test_ids))=1,'recipient can read the published reply');
RESET ROLE;
INSERT INTO public.user_blocks(blocker_id,blocked_user_id) VALUES('99999999-9999-4999-8999-999999999999','88888888-8888-4888-8888-888888888888');
SET ROLE authenticated;
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('77777777-cccc-4777-8777-777777777774','88888888-bbbb-4888-8888-888888888888','Note',
 '{"type":"Note","content":"Blocked @event_guest", "to":["https://www.w3.org/ns/activitystreams#Public"]}');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.notifications WHERE object_id='77777777-cccc-4777-8777-777777777774')=0,'blocked accounts cannot trigger notifications');
SET test.role='anon'; SET test.uid=''; SET test.jwt='{}'; SET ROLE anon;
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-cccc-4777-8777-777777777771','Anonymous')$q$,'42501');
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects WHERE id=(SELECT id FROM reply_test_ids))=1,'public reply audience is readable');
RESET ROLE;

UPDATE public.companies SET is_active=false WHERE id='77777777-cccc-4777-8777-777777777777';
INSERT INTO public.ap_objects(id,type,content) VALUES('77777777-cccc-4777-8777-777777777775','Note','{"type":"Note","content":"No publisher","to":["https://www.w3.org/ns/activitystreams#Public"]}');
SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects WHERE company_id='77777777-cccc-4777-8777-777777777777' OR id='77777777-cccc-4777-8777-777777777775')=0,'inactive company posts and actorless orphan posts remain hidden');
RESET ROLE;
