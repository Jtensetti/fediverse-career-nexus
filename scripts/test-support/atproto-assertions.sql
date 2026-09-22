BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('88888888-1111-4111-8111-111111111111','atproto-one@example.invalid',now(),'{"preferred_username":"atproto_one"}'),
('88888888-2222-4222-8222-222222222222','atproto-two@example.invalid',now(),'{"preferred_username":"atproto_two"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa','88888888-1111-4111-8111-111111111111');
INSERT INTO public.atproto_identities(did,user_id) VALUES('did:plc:abcdefghijklmnopqrstuvwx','88888888-1111-4111-8111-111111111111');
SET test.role='authenticated'; SET test.uid='88888888-1111-4111-8111-111111111111';
SET test.jwt='{"session_id":"88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}'; SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.atproto_identities)=1,'verified owner can see their identity');
SELECT public.test_rejected('SELECT * FROM public.atproto_oauth_states','42501');
SELECT public.test_rejected('SELECT * FROM public.atproto_auth_locks','42501');
SELECT public.test_rejected($q$SELECT public.claim_atproto_lock('x',gen_random_uuid())$q$,'42501');
SELECT public.test_rejected($q$UPDATE public.atproto_identities SET did='did:plc:anotheridentity'$q$,'42501');
SELECT public.test_rejected($q$INSERT INTO public.atproto_identities(did,user_id) VALUES('did:plc:forgedidentity','88888888-2222-4222-8222-222222222222')$q$,'42501');
SET test.jwt='{}';
SELECT public.test_assert((SELECT count(*) FROM public.atproto_identities)=0,'a sessionless JWT cannot inspect identity links');
SET test.uid='88888888-2222-4222-8222-222222222222';
SELECT public.test_assert((SELECT count(*) FROM public.atproto_identities)=0,'another account cannot inspect identity links');
RESET ROLE; SET ROLE anon;
SELECT public.test_rejected('SELECT * FROM public.atproto_identities','42501');
RESET ROLE; SET ROLE service_role;
SELECT public.test_assert(public.claim_atproto_lock('test-identity','88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'first identity lock succeeds');
SELECT public.test_assert(NOT public.claim_atproto_lock('test-identity',gen_random_uuid()),'concurrent identity lock fails');
UPDATE public.atproto_auth_locks SET expires_at=now()-interval '1 second';
SELECT public.test_assert(public.claim_atproto_lock('test-identity','88888888-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),'expired lock can be replaced');
DELETE FROM public.atproto_auth_locks WHERE lease_id='88888888-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SELECT public.test_assert((SELECT count(*) FROM public.atproto_auth_locks)=1,'old worker cannot release a newer lease');
INSERT INTO public.atproto_oauth_states(state_hash,browser_proof_hash,encrypted_state) VALUES(repeat('a',64),repeat('b',64),'v2:encrypted-test-state');
DELETE FROM public.atproto_oauth_states WHERE state_hash=repeat('a',64) AND browser_proof_hash=repeat('c',64) AND expires_at>now();
SELECT public.test_assert((SELECT count(*) FROM public.atproto_oauth_states)=1,'wrong browser cannot consume sign-in state');
WITH consumed AS (DELETE FROM public.atproto_oauth_states WHERE state_hash=repeat('a',64) AND browser_proof_hash=repeat('b',64) AND expires_at>now() RETURNING *)
SELECT public.test_assert((SELECT count(*) FROM consumed)=1,'correct browser consumes state once');
SELECT public.test_assert((SELECT count(*) FROM public.atproto_oauth_states)=0,'consumed state cannot be replayed');
SELECT public.test_rejected($q$INSERT INTO public.atproto_identities(did,user_id) VALUES('did:plc:secondidentity','88888888-1111-4111-8111-111111111111')$q$,'23505');
RESET ROLE;
DELETE FROM auth.users WHERE id='88888888-1111-4111-8111-111111111111';
SELECT public.test_assert((SELECT count(*) FROM public.atproto_identities)=0,'permanent account deletion erases identity mapping');
ROLLBACK;
