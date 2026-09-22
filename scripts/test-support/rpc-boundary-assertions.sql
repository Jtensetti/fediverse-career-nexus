INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('88888888-8888-4888-8888-888888888888','owner@example.invalid',now(),'{"preferred_username":"event_owner"}'),
('99999999-9999-4999-8999-999999999999','guest@example.invalid',now(),'{"preferred_username":"event_guest","role":"admin","is_admin":true}');
INSERT INTO auth.sessions(id,user_id) VALUES
('88888888-aaaa-4888-8888-888888888888','88888888-8888-4888-8888-888888888888'),
('99999999-aaaa-4999-8999-999999999999','99999999-9999-4999-8999-999999999999');
INSERT INTO public.actors(id,user_id,preferred_username,status) VALUES
('88888888-bbbb-4888-8888-888888888888','88888888-8888-4888-8888-888888888888','event_owner','disabled');
INSERT INTO public.events(id,user_id,title,start_date,visibility) VALUES
('88888888-eeee-4888-8888-888888888888','88888888-8888-4888-8888-888888888888','Private event',now()+interval '1 day','private'),
('99999999-eeee-4999-8999-999999999999','88888888-8888-4888-8888-888888888888','Other private event',now()+interval '1 day','private');
INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES
('88888888-cccc-4888-8888-888888888888','88888888-bbbb-4888-8888-888888888888','Question',
  jsonb_build_object('type','Question','to',jsonb_build_array('https://www.w3.org/ns/activitystreams#Public'),
    'oneOf','[{"name":"A"},{"name":"B"}]'::jsonb,'endTime',now()+interval '1 day')),
('99999999-cccc-4999-8999-999999999999','88888888-bbbb-4888-8888-888888888888','Question',
  jsonb_build_object('type','Question','oneOf','[{"name":"A"},{"name":"B"}]'::jsonb,'endTime',now()+interval '1 day'));

SET test.role='authenticated'; SET test.uid='99999999-9999-4999-8999-999999999999';
SET test.jwt='{"session_id":"99999999-aaaa-4999-8999-999999999999","aal":"aal1"}';
SET ROLE authenticated;
SELECT public.test_assert(NOT public.is_admin(auth.uid()),'user-editable metadata cannot grant administration');
SELECT public.test_rejected($q$INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),'admin')$q$,'42501');
SELECT public.test_assert((SELECT count(*) FROM public.events WHERE id='88888888-eeee-4888-8888-888888888888')=0,'uninvited guest cannot read private event');
SELECT public.test_rejected($q$INSERT INTO public.event_invitations(event_id,user_id) VALUES('88888888-eeee-4888-8888-888888888888',auth.uid())$q$,'42501');
SELECT public.test_assert(public.get_event_owner('88888888-eeee-4888-8888-888888888888') IS NULL,'owner lookup does not disclose private events');
SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[0]);
SELECT public.test_rejected($q$SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[0,1])$q$,'23514');
SELECT public.test_rejected($q$SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[5])$q$,'23514');
SELECT public.test_rejected($q$SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[NULL]::integer[])$q$,'23514');
SELECT public.test_assert((SELECT option_index FROM public.has_user_voted('88888888-cccc-4888-8888-888888888888',auth.uid()))=0,'invalid changes preserve the original ballot');
SELECT public.test_rejected($q$INSERT INTO public.poll_votes(poll_id,user_id,option_index) VALUES('88888888-cccc-4888-8888-888888888888',auth.uid(),1)$q$,'42501');
SELECT public.test_rejected($q$SELECT public.set_poll_votes('99999999-cccc-4999-8999-999999999999',ARRAY[0])$q$,'42501');
SELECT public.test_assert((SELECT count(*) FROM public.get_poll_results('99999999-cccc-4999-8999-999999999999'))=0,'private poll totals remain private');
RESET ROLE;

SET test.uid='88888888-8888-4888-8888-888888888888';
SET test.jwt='{"session_id":"88888888-aaaa-4888-8888-888888888888","aal":"aal1"}';
SET ROLE authenticated;
INSERT INTO public.event_invitations(event_id,user_id) VALUES('88888888-eeee-4888-8888-888888888888','99999999-9999-4999-8999-999999999999');
SELECT public.test_assert((SELECT count(*) FROM public.event_invitations WHERE event_id='88888888-eeee-4888-8888-888888888888')=1,'owner can invite and inspect invitees');
SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[1]);
SELECT public.test_assert((SELECT count(*) FROM public.has_user_voted('88888888-cccc-4888-8888-888888888888','99999999-9999-4999-8999-999999999999'))=0,'individual ballots are private even from the poll author');
SELECT public.test_assert((SELECT min(voters_count)=2 AND sum(vote_count)=2 FROM public.get_poll_results('88888888-cccc-4888-8888-888888888888')),'totals count real distinct voters');
RESET ROLE;

SET test.uid='99999999-9999-4999-8999-999999999999';
SET test.jwt='{"session_id":"99999999-aaaa-4999-8999-999999999999","aal":"aal1"}';
SET ROLE authenticated;
SELECT public.test_assert((SELECT count(*) FROM public.events WHERE id='88888888-eeee-4888-8888-888888888888')=1,'invitation grants the intended event access');
UPDATE public.event_invitations SET status='accepted' WHERE event_id='88888888-eeee-4888-8888-888888888888';
SELECT public.test_assert((SELECT status FROM public.event_invitations WHERE event_id='88888888-eeee-4888-8888-888888888888')='accepted','guest can answer the invitation');
SELECT public.test_rejected($q$UPDATE public.event_invitations SET event_id='99999999-eeee-4999-8999-999999999999'$q$,'42501');
SELECT public.test_rejected($q$UPDATE public.event_invitations SET user_id='22222222-2222-4222-8222-222222222222'$q$,'42501');
SELECT public.test_assert((SELECT count(*) FROM public.events WHERE id='99999999-eeee-4999-8999-999999999999')=0,'invitation cannot be moved to another event');
SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[1]);
SELECT public.test_assert((SELECT count(*)=1 AND min(option_index)=1 FROM public.has_user_voted('88888888-cccc-4888-8888-888888888888',auth.uid())),'changing a vote replaces it atomically');
SELECT public.test_assert((SELECT min(voters_count)=2 AND sum(vote_count)=2 FROM public.get_poll_results('88888888-cccc-4888-8888-888888888888')),'changing a vote does not add a voter');
SELECT public.test_assert((public.get_participant_info('88888888-8888-4888-8888-888888888888')->>'found')::boolean,'active participant public details are readable');
RESET ROLE;

UPDATE public.ap_objects SET content=jsonb_set(content,'{endTime}',to_jsonb(now()-interval '1 day')) WHERE id='88888888-cccc-4888-8888-888888888888';
SET ROLE authenticated;
SELECT public.test_rejected($q$SELECT public.set_poll_votes('88888888-cccc-4888-8888-888888888888',ARRAY[0])$q$,'23514');
RESET ROLE;
UPDATE public.profiles SET deleted_at=now() WHERE id='88888888-8888-4888-8888-888888888888';
SET ROLE authenticated;
SELECT public.test_assert(public.get_participant_info('88888888-8888-4888-8888-888888888888')='{"found":false}'::jsonb,'participant RPC cannot bypass immediate account hiding');
SELECT public.test_assert((SELECT count(*) FROM public.get_poll_results('88888888-cccc-4888-8888-888888888888'))=0,'deleted account polls hide aggregate results too');
RESET ROLE;

SET test.role='anon'; SET test.uid=''; SET test.jwt='{}'; SET ROLE anon;
SELECT public.test_rejected($q$SELECT public.has_user_voted('88888888-cccc-4888-8888-888888888888','99999999-9999-4999-8999-999999999999')$q$,'42501');
SELECT public.test_rejected($q$SELECT public.recalc_company_counts('88888888-cccc-4888-8888-888888888888')$q$,'42501');
SELECT public.test_rejected($q$SELECT public.get_participant_info('88888888-8888-4888-8888-888888888888')$q$,'42501');
SELECT public.test_assert(NOT public.is_user_invited_to_event('88888888-eeee-4888-8888-888888888888','99999999-9999-4999-8999-999999999999'),'anonymous API cannot enumerate invitations');
RESET ROLE;
