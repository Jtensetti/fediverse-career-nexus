CREATE FUNCTION public.test_assert(ok boolean, description text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'Assertion failed: %',description; END IF; END $$;
CREATE FUNCTION public.test_denied(statement text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN insufficient_privilege THEN RETURN;
  END;
  RAISE EXCEPTION 'Expected access denial: %',statement;
END $$;
GRANT EXECUTE ON FUNCTION public.test_assert(boolean,text),public.test_denied(text) TO anon,authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('11111111-1111-4111-8111-111111111111','alice@example.invalid',now(),'{"preferred_username":"alice"}'),
('22222222-2222-4222-8222-222222222222','bob@example.invalid',now(),'{"preferred_username":"bob"}'),
('33333333-3333-4333-8333-333333333333','carol@example.invalid',now(),'{"preferred_username":"carol"}');
INSERT INTO auth.sessions(id,user_id) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
UPDATE public.profiles SET dm_privacy='everyone';
INSERT INTO public.actors(id,user_id,preferred_username,status) VALUES
('aaaaaaaa-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111','alice','disabled'),
('bbbbbbbb-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222','bob','disabled');
INSERT INTO public.messages(id,sender_id,recipient_id,content) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-111111111111','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','private-one'),
('bbbbbbbb-bbbb-4bbb-8bbb-222222222222','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','private-two');
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('11111111-aaaa-4aaa-8aaa-111111111111','aaaaaaaa-1111-4111-8111-111111111111','Note','{"type":"Note","content":"Private object"}'),
('22222222-bbbb-4bbb-8bbb-222222222222','aaaaaaaa-1111-4111-8111-111111111111','Note','{"type":"Note","content":"Public object","to":["https://www.w3.org/ns/activitystreams#Public"]}');
INSERT INTO public.companies(id,slug,name,claim_status) VALUES
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','test-company','Test company','claimed');
INSERT INTO public.company_roles(company_id,user_id,role) VALUES
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111111','owner');

INSERT INTO public.experiences(user_id,title,company,start_date) VALUES
('22222222-2222-4222-8222-222222222222','Engineer','Private company','2020-01-01');
INSERT INTO public.education(user_id,institution,degree,start_year) VALUES
('22222222-2222-4222-8222-222222222222','Private school','Degree',2020);
INSERT INTO public.profile_section_visibility(user_id,section,visibility) VALUES
('22222222-2222-4222-8222-222222222222','experience','connections'),
('22222222-2222-4222-8222-222222222222','education','logged_in');

SET ROLE anon;
SELECT public.test_assert((SELECT count(*) FROM public.messages)=0,'anonymous users cannot read messages');
SELECT public.test_assert((SELECT count(*) FROM public.public_experiences)=0,'public CV view enforces connections visibility');
SELECT public.test_assert((SELECT count(*) FROM public.public_education)=0,'public CV view enforces signed-in visibility');
SELECT public.test_assert((SELECT count(*) FROM public.ap_objects)=1,'anonymous users only read public objects');
SELECT public.test_assert((SELECT count(*) FROM public.federated_feed)=1,'anonymous feed reads only public top-level posts');
SELECT public.test_denied('SELECT private_key FROM public.actors');
SELECT public.test_denied('SELECT public.create_mutual_connection_follows(''11111111-1111-4111-8111-111111111111'',''22222222-2222-4222-8222-222222222222'')');
SELECT public.test_denied('INSERT INTO public.mfa_recovery_requests(email) VALUES (''attacker@example.invalid'')');
RESET ROLE;

SELECT set_config('test.uid','11111111-1111-4111-8111-111111111111',false);
SELECT set_config('test.role','authenticated',false);
SELECT set_config('test.jwt','{"role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal1"}',false);
SET ROLE authenticated;
SELECT public.test_assert(public.current_session_is_verified(),'session without MFA factors is usable');
SELECT public.test_assert((SELECT count(*) FROM public.public_education)=1,'signed-in visibility allows verified sessions');
SELECT public.test_assert((SELECT count(*) FROM public.public_experiences)=0,'unconnected user cannot read restricted experience');
SELECT public.test_denied('UPDATE public.education SET verification_status=''verified''');
SELECT public.test_assert((SELECT count(*) FROM public.messages)=1,'Alice cannot read Bob and Carol conversation');
SELECT public.test_assert((SELECT count(*) FROM public.get_following_feed(20,0))=2,'following feed contains own posts without a client-side filter');
SELECT public.test_assert((SELECT count(*) FROM public.get_following_feed(1,1))=1,'following feed pages after matching authors');

SELECT public.test_denied('UPDATE public.messages SET content=''forged''');
SELECT public.test_denied('UPDATE public.profiles SET is_verified=true');
SELECT public.test_denied('UPDATE public.companies SET verified_at=now()');
SELECT public.test_denied('SELECT access_token_encrypted FROM public.federated_sessions');
SELECT public.test_denied('INSERT INTO public.messages(sender_id,recipient_id,content,is_federated) VALUES (''11111111-1111-4111-8111-111111111111'',''22222222-2222-4222-8222-222222222222'',''bypass'',true)');
SELECT public.test_denied('INSERT INTO public.message_requests(sender_id,recipient_id,status) VALUES (''11111111-1111-4111-8111-111111111111'',''22222222-2222-4222-8222-222222222222'',''accepted'')');
SELECT public.test_assert((public.can_message_user('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')->>'can_message')::boolean,'recipient allows messages');
SELECT public.test_assert(NOT (public.can_message_user('22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333')->>'can_message')::boolean,'cannot impersonate sender');
SELECT public.test_denied('SELECT * FROM public.get_smart_suggestions(''22222222-2222-4222-8222-222222222222'',10)');
SELECT public.test_denied('SELECT public.get_connection_degree(''22222222-2222-4222-8222-222222222222'',''33333333-3333-4333-8333-333333333333'')');
SELECT public.test_denied('INSERT INTO public.user_connections(user_id,connected_user_id,status) VALUES (''11111111-1111-4111-8111-111111111111'',''22222222-2222-4222-8222-222222222222'',''accepted'')');
INSERT INTO public.user_connections(id,user_id,connected_user_id,status) VALUES
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','pending');
WITH attempted AS (UPDATE public.user_connections SET status='accepted' WHERE id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' RETURNING id)
SELECT public.test_assert((SELECT count(*) FROM attempted)=0,'requester cannot approve own connection');
RESET ROLE;
SELECT public.test_assert(EXISTS(SELECT 1 FROM public.notifications WHERE object_id='dddddddd-dddd-4ddd-8ddd-dddddddddddd' AND recipient_id='22222222-2222-4222-8222-222222222222' AND type='connection_request'),'connection request notification is transactional');
SET ROLE authenticated;
SELECT public.create_owned_company('{"slug":"atomic-company","name":"Atomic company"}');
SELECT public.test_assert(EXISTS(SELECT 1 FROM public.company_roles r JOIN public.companies c ON c.id=r.company_id WHERE c.slug='atomic-company' AND r.user_id='11111111-1111-4111-8111-111111111111' AND r.role='owner'),'company creation includes its owner');
DO $$ BEGIN
  BEGIN PERFORM public.create_owned_company('{"slug":"atomic-company","name":"Duplicate"}');
  EXCEPTION WHEN unique_violation THEN RETURN; END;
  RAISE EXCEPTION 'Duplicate company URL was accepted';
END $$;
SELECT public.test_assert((SELECT count(*) FROM public.companies WHERE slug='atomic-company')=1,'duplicate creation leaves no orphan');
RESET ROLE;
DELETE FROM public.companies WHERE slug='atomic-company';
SET ROLE authenticated;
RESET ROLE;

INSERT INTO public.user_blocks(blocker_id,blocked_user_id) VALUES ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111');
INSERT INTO auth.mfa_factors(id,user_id,status) VALUES (gen_random_uuid(),'11111111-1111-4111-8111-111111111111','verified');
SET ROLE authenticated;
SELECT public.test_assert(NOT public.current_session_is_verified(),'aal1 does not bypass enrolled MFA');
SELECT public.test_assert((SELECT count(*) FROM public.messages)=0,'MFA required at the database boundary');
SELECT public.test_assert((SELECT count(*) FROM public.profiles)=0,'private profile unavailable before MFA');
RESET ROLE;
SELECT set_config('test.jwt','{"role":"authenticated","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","aal":"aal2"}',false);
SET ROLE authenticated;
SELECT public.test_assert(public.current_session_is_verified(),'aal2 unlocks own session');
SELECT public.test_assert((SELECT count(*) FROM public.messages)=1,'MFA passed user can read own conversation');
SELECT public.test_assert(NOT (public.can_message_user('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222')->>'can_message')::boolean,'recipient block prevents new messages');
RESET ROLE;
DELETE FROM auth.sessions WHERE user_id='11111111-1111-4111-8111-111111111111';
SET ROLE authenticated;
SELECT public.test_assert(NOT public.current_session_is_active(),'signed JWT cannot resurrect revoked session');
SELECT public.test_assert((SELECT count(*) FROM public.messages)=0,'revoked session cannot access private rows');
RESET ROLE;

-- Account deletion must abort before it can leave an organisation ownerless.
DO $$ BEGIN
  BEGIN DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM NOT LIKE 'Transfer organisation ownership%' THEN RAISE; END IF;
    RETURN;
  END;
  RAISE EXCEPTION 'Sole owner deletion was not blocked';
END $$;
INSERT INTO public.company_roles(company_id,user_id,role) VALUES
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','22222222-2222-4222-8222-222222222222','owner');
DELETE FROM auth.users WHERE id='11111111-1111-4111-8111-111111111111';
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.ap_objects WHERE id IN ('11111111-aaaa-4aaa-8aaa-111111111111','22222222-bbbb-4bbb-8bbb-222222222222')),'deletion does not leave detached post content');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.company_roles WHERE user_id='11111111-1111-4111-8111-111111111111'),'deletion cleans ownership rows without foreign keys');
SELECT public.test_assert(EXISTS(SELECT 1 FROM auth.users WHERE id='22222222-2222-4222-8222-222222222222'),'deletion preserves the other account');
SELECT public.test_assert(NOT EXISTS(SELECT 1 FROM public.notifications WHERE content LIKE 'private-%'),'message contents never enter notifications');

SELECT public.test_assert(NOT public.is_username_available('alice'),'a deleted federation address cannot be taken over');
DO $$ BEGIN
  BEGIN INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
    ('44444444-4444-4444-8444-444444444444','takeover@example.invalid',now(),'{"preferred_username":"alice"}');
  EXCEPTION WHEN unique_violation THEN RETURN; END;
  RAISE EXCEPTION 'Retired address takeover was accepted';
END $$;
