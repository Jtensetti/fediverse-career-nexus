BEGIN;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','regression@example.invalid',now(),'{"preferred_username":"regression_alice"}');
-- On an existing installation the auth trigger inserts this; the fixture calls it via a temporary trigger.
DO $$
DECLARE aid uuid; first_key text; qty integer; obj uuid := '22222222-2222-4222-8222-222222222222';
BEGIN
 aid := public.ensure_local_actor('11111111-1111-4111-8111-111111111111','','',false);
 IF (SELECT status FROM public.actors WHERE id=aid) <> 'disabled' THEN RAISE EXCEPTION 'Local-only account federates'; END IF;
 IF (SELECT public_key FROM public.actors WHERE id=aid) IS NOT NULL THEN RAISE EXCEPTION 'Premature identity lock'; END IF;
 INSERT INTO public.ap_objects(id,attributed_to,type,content) VALUES(obj,aid,'Create','{"type":"Create","object":{"type":"Note","content":"hello","to":["https://www.w3.org/ns/activitystreams#Public"]}}');
 IF EXISTS(SELECT 1 FROM public.federation_queue_partitioned WHERE actor_id=aid) THEN RAISE EXCEPTION 'Disabled actor queued public content'; END IF;
 PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','-----BEGIN PRIVATE KEY-----one','-----BEGIN PUBLIC KEY-----one',true);
 PERFORM public.ensure_local_actor('11111111-1111-4111-8111-111111111111','-----BEGIN PRIVATE KEY-----two','-----BEGIN PUBLIC KEY-----two',true);
 SELECT public_key INTO first_key FROM public.actors WHERE id=aid;
 IF first_key <> '-----BEGIN PUBLIC KEY-----one' THEN RAISE EXCEPTION 'Key rotated during repeated provisioning'; END IF;
 BEGIN
   UPDATE public.profiles SET username='unexpected_rename' WHERE id='11111111-1111-4111-8111-111111111111';
   RAISE EXCEPTION 'Published identity could be renamed';
 EXCEPTION WHEN raise_exception THEN
   IF SQLERRM = 'Published identity could be renamed' THEN RAISE; END IF;
 END;
 UPDATE public.ap_objects SET content=jsonb_set(content,'{object,content}','"edited"') WHERE id=obj;
 SELECT count(*) INTO qty FROM public.federation_queue_partitioned WHERE actor_id=aid AND activity->>'type'='Update';
 IF qty<>1 THEN RAISE EXCEPTION 'Edit not queued exactly once'; END IF;
 DELETE FROM public.ap_objects WHERE id=obj;
 IF EXISTS(SELECT 1 FROM public.ap_objects WHERE id=obj) OR NOT EXISTS(SELECT 1 FROM public.federation_tombstones WHERE id=obj) THEN RAISE EXCEPTION 'Deletion or tombstone missing'; END IF;
 SELECT count(*) INTO qty FROM public.federation_queue_partitioned WHERE actor_id=aid AND activity->>'type'='Delete';
 IF qty<>1 THEN RAISE EXCEPTION 'Deletion not queued'; END IF;
 INSERT INTO public.ap_objects(attributed_to,type,content) VALUES(aid,'Note','{"type":"Note","content":"private","to":["https://remote.example/users/bob"]}');
 SELECT count(*) INTO qty FROM public.federation_queue_partitioned WHERE actor_id=aid;
 IF qty<>2 THEN RAISE EXCEPTION 'Private content entered federation queue'; END IF;
 IF EXISTS(SELECT 1 FROM public.federation_public_objects WHERE attributed_to=aid) THEN RAISE EXCEPTION 'Private content visible in public outbox'; END IF;
 IF has_column_privilege('authenticated','public.actors','private_key','SELECT') THEN RAISE EXCEPTION 'Signing key is client-readable'; END IF;
 IF has_function_privilege('anon','public.ensure_actor_keys(uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'Signing RPC is public'; END IF;
 IF has_function_privilege('authenticated','public.claim_federation_items(integer,integer)','EXECUTE') THEN RAISE EXCEPTION 'User can claim delivery jobs'; END IF;
 IF NOT has_column_privilege('anon','public.actors','public_key','SELECT') THEN RAISE EXCEPTION 'Public key is hidden'; END IF;
END $$;
-- A delayed Create must not be overtaken by a later Update/Delete.
DELETE FROM public.federation_queue_partitioned;
INSERT INTO public.federation_queue_partitioned(id,actor_id,partition_key,status,created_at,next_retry_at) VALUES
 ('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111',0,'retry',now()-interval '2 minutes',now()+interval '1 minute'),
 ('33333333-3333-4333-8333-333333333332','11111111-1111-4111-8111-111111111111',0,'pending',now()-interval '1 minute',now());
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.claim_federation_items(0,10)) THEN RAISE EXCEPTION 'Later event overtook delayed delivery'; END IF;
 UPDATE public.federation_queue_partitioned SET next_retry_at=now() WHERE status='retry';
 IF (SELECT count(*) FROM public.claim_federation_items(0,10)) <> 1 THEN RAISE EXCEPTION 'Concurrent jobs for same actor'; END IF;
 IF EXISTS(SELECT 1 FROM public.claim_federation_items(0,10)) THEN RAISE EXCEPTION 'Later event overtook processing job'; END IF;
 UPDATE public.federation_queue_partitioned SET status='processed' WHERE status='processing';
 IF (SELECT count(*) FROM public.claim_federation_items(0,10)) <> 1 THEN RAISE EXCEPTION 'Next event was not released'; END IF;
END $$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('44444444-4444-4444-8444-444444444444','pending@example.invalid','{"preferred_username":"regression_pending"}');
DO $$ BEGIN
 IF public.request_email_verification(' PENDING@example.invalid ') IS NULL THEN RAISE EXCEPTION 'Confirmation not issued'; END IF;
 IF public.request_email_verification('pending@example.invalid') IS NOT NULL THEN RAISE EXCEPTION 'Confirmation cooldown bypassed'; END IF;
 IF public.request_email_verification('regression@example.invalid') IS NOT NULL THEN RAISE EXCEPTION 'Confirmed account received token'; END IF;
 IF public.request_email_verification('unknown@example.invalid') IS NOT NULL THEN RAISE EXCEPTION 'Unknown account received token'; END IF;
 IF has_table_privilege('authenticated','public.email_verification_tokens','SELECT') OR has_function_privilege('anon','public.request_email_verification(text)','EXECUTE') THEN RAISE EXCEPTION 'Confirmation tokens exposed'; END IF;
END $$;
ROLLBACK;
