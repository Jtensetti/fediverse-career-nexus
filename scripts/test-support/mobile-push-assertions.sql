-- Synthetic identities; no live users or provider delivery in this suite.
RESET ROLE;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('bbbbbbbb-1111-4111-8111-111111111111','push-one@example.invalid',now(),'{"preferred_username":"push_one"}'),
('bbbbbbbb-2222-4222-8222-222222222222','push-two@example.invalid',now(),'{"preferred_username":"push_two"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('cccccccc-1111-4111-8111-111111111111','bbbbbbbb-1111-4111-8111-111111111111'),
('cccccccc-2222-4222-8222-222222222222','bbbbbbbb-2222-4222-8222-222222222222');
SET ROLE service_role;
SELECT public.register_mobile_push('dddddddd-1111-4111-8111-111111111111','bbbbbbbb-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-111111111111','ios',repeat('a',64),'v2:encrypted-test-token');
SELECT public.test_rejected($q$SELECT public.register_mobile_push('dddddddd-1111-4111-8111-111111111111','bbbbbbbb-2222-4222-8222-222222222222','cccccccc-2222-4222-8222-222222222222','android',repeat('b',64),'v2:other')$q$,'42501');
SELECT public.test_rejected($q$SELECT public.register_mobile_push('dddddddd-2222-4222-8222-222222222222','bbbbbbbb-1111-4111-8111-111111111111','cccccccc-2222-4222-8222-222222222222','ios',repeat('b',64),'v2:other')$q$,'42501');
INSERT INTO public.notifications(id,type,recipient_id,actor_id) VALUES
('eeeeeeee-1111-4111-8111-111111111111','follow','bbbbbbbb-1111-4111-8111-111111111111','bbbbbbbb-2222-4222-8222-222222222222');
SELECT public.test_assert((SELECT count(*) FROM public.mobile_push_deliveries)=1,'committed notification creates one device delivery');
SELECT public.test_assert((SELECT public.mobile_push_eligible(id) FROM public.mobile_push_deliveries),'active device is eligible');
SELECT public.test_assert((SELECT count(*) FROM public.claim_mobile_push(false,10))=1,'worker claims pending work');
SELECT public.test_assert((SELECT count(*) FROM public.claim_mobile_push(false,10))=0,'another worker cannot reclaim a live lease');
UPDATE public.mobile_push_deliveries SET attempts=5;
SELECT public.test_assert((SELECT count(*) FROM public.claim_mobile_push(false,10))=0,'last attempt retains its live lease');
SELECT public.test_assert((SELECT state='sending' FROM public.mobile_push_deliveries),'concurrent cleanup cannot discard an active final attempt');
UPDATE public.mobile_push_deliveries SET attempts=1;
UPDATE public.notifications SET read=true WHERE id='eeeeeeee-1111-4111-8111-111111111111';
SELECT public.test_assert(NOT (SELECT public.mobile_push_eligible(id) FROM public.mobile_push_deliveries),'read notifications stop delivery');
UPDATE public.notifications SET read=false WHERE id='eeeeeeee-1111-4111-8111-111111111111';
INSERT INTO public.user_blocks(blocker_id,blocked_user_id) VALUES('bbbbbbbb-1111-4111-8111-111111111111','bbbbbbbb-2222-4222-8222-222222222222');
SELECT public.test_assert(NOT (SELECT public.mobile_push_eligible(id) FROM public.mobile_push_deliveries),'block introduced after enqueue stops delivery');
DELETE FROM public.user_blocks WHERE blocker_id='bbbbbbbb-1111-4111-8111-111111111111';

RESET ROLE; SET test.role='authenticated'; SET test.uid='bbbbbbbb-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"cccccccc-1111-4111-8111-111111111111","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.mobile_notification_inbox())=1,'verified owner sees the notification');
SELECT public.test_rejected('SELECT * FROM public.mobile_push_devices','42501');
SELECT public.test_rejected('SELECT * FROM public.mobile_push_deliveries','42501');
SELECT public.test_rejected('SELECT public.claim_mobile_push()','42501');
RESET ROLE; SET test.uid='bbbbbbbb-2222-4222-8222-222222222222';
SET test.jwt='{"session_id":"cccccccc-2222-4222-8222-222222222222","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.mobile_notification_inbox('eeeeeeee-1111-4111-8111-111111111111'))=0,'another account cannot open a pushed identifier');
RESET ROLE;
INSERT INTO auth.mfa_factors(id,user_id,status) VALUES('ffffffff-2222-4222-8222-222222222222','bbbbbbbb-2222-4222-8222-222222222222','verified');
SET ROLE authenticated;
SELECT public.test_rejected('SELECT * FROM public.mobile_notification_inbox()','42501');
RESET ROLE; SET ROLE anon;
SELECT public.test_rejected('SELECT * FROM public.mobile_notification_inbox()','42501');
RESET ROLE; SET ROLE service_role;

SELECT public.register_mobile_push('dddddddd-1111-4111-8111-111111111111','bbbbbbbb-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-111111111111','ios',repeat('c',64),'v2:rotated-token');
SELECT public.test_assert((SELECT count(*) FROM public.mobile_push_deliveries)=0,'token rotation removes old claimed work');
INSERT INTO public.notifications(id,type,recipient_id,actor_id) VALUES
('eeeeeeee-3333-4333-8333-333333333333','follow','bbbbbbbb-1111-4111-8111-111111111111','bbbbbbbb-2222-4222-8222-222222222222');
UPDATE public.mobile_push_deliveries SET attempts=5;
SELECT public.test_assert((SELECT count(*) FROM public.claim_mobile_push(false,10))=0,'exhausted sends are not retried');
SELECT public.test_assert((SELECT state='failed' FROM public.mobile_push_deliveries),'exhausted jobs are terminal');
RESET ROLE;
DELETE FROM auth.sessions WHERE id='cccccccc-1111-4111-8111-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.mobile_push_devices)=0 AND (SELECT count(*) FROM public.mobile_push_deliveries)=0,'logout cascades through registration and delivery');
INSERT INTO auth.sessions(id,user_id) VALUES('cccccccc-1111-4111-8111-111111111111','bbbbbbbb-1111-4111-8111-111111111111');
SET ROLE service_role;
SELECT public.register_mobile_push('dddddddd-1111-4111-8111-111111111111','bbbbbbbb-1111-4111-8111-111111111111','cccccccc-1111-4111-8111-111111111111','ios',repeat('a',64),'v2:encrypted-test-token');
RESET ROLE;
UPDATE public.profiles SET deleted_at=now() WHERE id='bbbbbbbb-1111-4111-8111-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.mobile_push_devices)=0,'account deletion removes device tokens immediately');
