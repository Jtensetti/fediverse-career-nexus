BEGIN;
SELECT public.test_assert(public.assess_public_text('Jag tycker att beslutet är fullständigt fel. Fan vad frustrerande.') ->> 'level'='allow','criticism and untargeted swearing remain allowed');
SELECT public.test_assert(public.assess_public_text('I''ll kill you')->>'level'='review','contracted English threat is assessed');
SELECT public.test_assert(public.assess_public_text('You''re an idiot')->>'level'='warn','contracted English insult gives a reminder');
SELECT public.test_assert(public.assess_public_text('Du är en idiot!')->>'level'='warn','a personal insult receives an overridable reminder');
SELECT public.test_assert(public.assess_public_text('Jag ska döda dig')->>'level'='review','direct threat requires human review');
SELECT public.test_assert(public.assess_public_text('Hon skrev "jag ska döda dig". Jag har anmält hotet.')->>'level'='warn','explicit reported quotation is not automatically treated as endorsement');
SELECT public.test_assert(public.assess_public_text('Jag ska inte döda dig. I will not kill you.')->>'level'='allow','negated threats are not direct threats');
SELECT public.test_assert(public.assess_public_text('KILL ALL MUSLIMS')->>'level'='review','explicit group violence is held');
SELECT public.test_assert(public.assess_public_text('Ｉ will kill you')->>'level'='review','compatibility characters are normalized');

INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('77777777-1111-4111-8111-111111111111','review-author@example.invalid',now(),'{"preferred_username":"review_author"}'),
('77777777-2222-4222-8222-222222222222','review-reader@example.invalid',now(),'{"preferred_username":"review_reader"}'),
('77777777-3333-4333-8333-333333333333','review-moderator@example.invalid',now(),'{"preferred_username":"review_moderator"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa','77777777-1111-4111-8111-111111111111'),
('77777777-bbbb-4bbb-8bbb-bbbbbbbbbbbb','77777777-2222-4222-8222-222222222222'),
('77777777-cccc-4ccc-8ccc-cccccccccccc','77777777-3333-4333-8333-333333333333');
INSERT INTO public.user_roles(user_id,role) VALUES('77777777-3333-4333-8333-333333333333','moderator');
INSERT INTO public.actors(id,user_id,preferred_username,status,public_key) VALUES
('77777777-dddd-4ddd-8ddd-dddddddddddd','77777777-1111-4111-8111-111111111111','review_author','active','test-public-key');
INSERT INTO storage.objects(id,bucket_id,name,owner,owner_id,metadata) VALUES('77777777-ffff-4fff-8fff-111111111111','posts','held-review.jpg','77777777-1111-4111-8111-111111111111','77777777-1111-4111-8111-111111111111','{"mimetype":"image/jpeg"}');
SET test.role='authenticated'; SET test.uid='77777777-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
-- The client cannot bypass assessment, even by providing a published status.
INSERT INTO public.ap_objects(id,attributed_to,type,content,moderation_status) VALUES
('77777777-0001-4000-8000-000000000001','77777777-dddd-4ddd-8ddd-dddddddddddd','Note',
'{"type":"Note","content":"Jag ska döda dig @review_reader","attachment":[{"url":"https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/held-review.jpg"}],"to":["https://www.w3.org/ns/activitystreams#Public"]}','published') RETURNING id;
SELECT public.test_assert((SELECT moderation_status FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001')='pending','server trigger holds direct writes and permits authors to inspect their own submission');
SELECT public.test_assert((SELECT count(*) FROM public.get_content_review_queue(true))=1,'author sees their hold');
SELECT public.test_rejected($q$SELECT public.create_post_reply('77777777-0001-4000-8000-000000000001','Reply to held post')$q$,'42501');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.get_member_feed('local') WHERE id='77777777-0001-4000-8000-000000000001'),'held content is absent even from its authors ordinary feed');
SELECT public.test_rejected($q$UPDATE public.ap_objects SET moderation_status='published' WHERE id='77777777-0001-4000-8000-000000000001'$q$,'42501');
SELECT public.test_rejected($q$SELECT public.decide_content_review('post','77777777-0001-4000-8000-000000000001',(SELECT moderation_revision FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001'),'approve','Own approval')$q$,'42501');
SELECT public.test_rejected('SELECT * FROM public.get_content_review_queue(false)','42501');
RESET ROLE;
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.notifications WHERE object_id='77777777-0001-4000-8000-000000000001'),'held mentions do not notify recipients');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.federation_queue_partitioned WHERE activity->>'object_id'='77777777-0001-4000-8000-000000000001'),'held posts never enter the federation queue');
SET ROLE service_role;
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.federation_public_objects WHERE id='77777777-0001-4000-8000-000000000001'),'service-role federation discovery also excludes held content');
RESET ROLE;
SET ROLE anon;
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001'),'anonymous direct API reads cannot see held content');
SELECT public.test_rejected('SELECT * FROM public.get_content_review_queue(true)','42501');
RESET ROLE;
SET test.uid='77777777-2222-4222-8222-222222222222';
SET test.jwt='{"session_id":"77777777-bbbb-4bbb-8bbb-bbbbbbbbbbbb","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001'),'other members cannot read held content');
SELECT public.test_assert((SELECT count(*) FROM public.get_content_review_queue(true))=0,'another member cannot inspect the authors queue');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('posts','held-review.jpg','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/held-review.jpg'))=0,'privileged public media gateway cannot expose held uploads');
SET test.uid='77777777-3333-4333-8333-333333333333';
SET test.jwt='{"session_id":"77777777-cccc-4ccc-8ccc-cccccccccccc","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.get_content_review_queue(false))=1,'moderators can read the pending text through the authorized queue');
SELECT public.decide_content_review('post','77777777-0001-4000-8000-000000000001',(SELECT revision FROM public.get_content_review_queue(false) WHERE content_id='77777777-0001-4000-8000-000000000001'),'approve','Context reviewed and approved');
RESET ROLE;
SELECT public.test_assert((SELECT count(*) FROM public.resolve_public_media('posts','held-review.jpg','https://anknmcmqljejabxbeohv.supabase.co/functions/v1/public-media/posts/held-review.jpg'))=1,'approval releases the associated public media');
SELECT public.test_assert((SELECT count(*) FROM public.federation_queue_partitioned WHERE activity->>'object_id'='77777777-0001-4000-8000-000000000001' AND activity->>'type'='Create')=1,'approval queues exactly one Create');
SELECT public.test_assert((SELECT count(*) FROM public.notifications WHERE object_id='77777777-0001-4000-8000-000000000001')=1,'approval notifies once with the author rather than the moderator');
SELECT public.test_assert((SELECT actor_id FROM public.notifications WHERE object_id='77777777-0001-4000-8000-000000000001')='77777777-1111-4111-8111-111111111111','notification attribution');
SET test.uid='77777777-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
UPDATE public.ap_objects SET content=jsonb_set(content,'{content}','"I will kill you @review_reader"') WHERE id='77777777-0001-4000-8000-000000000001';
SELECT public.test_assert((SELECT moderation_status FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001')='pending','an edit must pass assessment again');
SELECT public.decide_content_review('post','77777777-0001-4000-8000-000000000001',(SELECT revision FROM public.get_content_review_queue(true) WHERE content_id='77777777-0001-4000-8000-000000000001'),'appeal','This is context for the moderator');
SELECT public.test_rejected($q$SELECT public.decide_content_review('post','77777777-0001-4000-8000-000000000001',(SELECT revision FROM public.get_content_review_queue(true) WHERE content_id='77777777-0001-4000-8000-000000000001'),'appeal','Duplicate context')$q$,'23505');
RESET ROLE;
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.notifications WHERE object_id='77777777-0001-4000-8000-000000000001'),'holding an edit removes stale notifications');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.federation_queue_partitioned WHERE activity->>'object_id'='77777777-0001-4000-8000-000000000001' AND activity->>'type' IN ('Create','Update')),'holding an edit cancels stale queued text');
SELECT public.test_assert(EXISTS(SELECT 1 FROM public.federation_queue_partitioned WHERE activity->>'object_id'='77777777-0001-4000-8000-000000000001' AND activity->>'type'='Delete'),'previously public content is withdrawn from federation');
SET test.uid='77777777-3333-4333-8333-333333333333';
SET test.jwt='{"session_id":"77777777-cccc-4ccc-8ccc-cccccccccccc","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_rejected($q$SELECT public.decide_content_review('post','77777777-0001-4000-8000-000000000001',(SELECT revision FROM public.content_review_decisions WHERE action='approve'),'approve','Stale browser tab')$q$,'40001');
SELECT public.decide_content_review('post','77777777-0001-4000-8000-000000000001',(SELECT revision FROM public.get_content_review_queue(false) WHERE content_id='77777777-0001-4000-8000-000000000001'),'reject','Direct threat directed at another participant');
RESET ROLE;
SET test.uid='77777777-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"77777777-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT status FROM public.get_content_review_queue(true) WHERE content_id='77777777-0001-4000-8000-000000000001')='rejected','author can see rejection');
UPDATE public.ap_objects SET content=jsonb_set(content,'{content}','"Jag är arg över beslutet och vill förstå underlaget."') WHERE id='77777777-0001-4000-8000-000000000001';
SELECT public.test_assert((SELECT moderation_status FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001')='published','a rewritten text can be published');
INSERT INTO public.articles(id,user_id,title,content,slug,published) VALUES
('77777777-0002-4000-8000-000000000002',auth.uid(),'Artikel med hot','Jag ska döda dig','review-test',false);
SELECT public.test_assert((SELECT moderation_status FROM public.articles WHERE id='77777777-0002-4000-8000-000000000002')='published','private drafts do not enter the moderation queue');
UPDATE public.articles SET published=true WHERE id='77777777-0002-4000-8000-000000000002';
SELECT public.test_assert((SELECT moderation_status FROM public.articles WHERE id='77777777-0002-4000-8000-000000000002')='pending','publishing a draft triggers assessment');
RESET ROLE;
DELETE FROM public.ap_objects WHERE id='77777777-0001-4000-8000-000000000001';
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.content_review_decisions WHERE content_id='77777777-0001-4000-8000-000000000001'),'purging content also purges associated review explanations');
ROLLBACK;
