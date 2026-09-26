BEGIN;

-- Private to service-role endpoints. A registration belongs to a live Auth
-- session as well as an account; logging out removes it through the FK.
CREATE TABLE public.mobile_push_devices (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  token_hash text NOT NULL UNIQUE CHECK (length(token_hash)=64),
  token_ciphertext text NOT NULL CHECK (token_ciphertext LIKE 'v2:%'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '30 days'
);
CREATE INDEX mobile_push_devices_user ON public.mobile_push_devices(user_id);
CREATE INDEX mobile_push_devices_session ON public.mobile_push_devices(session_id);

CREATE TABLE public.mobile_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.mobile_push_devices(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','receipt','checking','delivered','failed','cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  receipt_attempts integer NOT NULL DEFAULT 0,
  ticket_id text,
  lease_id uuid,
  lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  UNIQUE(device_id,notification_id)
);
CREATE INDEX mobile_push_deliveries_pending ON public.mobile_push_deliveries(next_attempt_at) WHERE state IN ('pending','sending','receipt','checking');
CREATE INDEX mobile_push_deliveries_notification ON public.mobile_push_deliveries(notification_id);
ALTER TABLE public.mobile_push_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mobile_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mobile_push_devices,public.mobile_push_deliveries FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.mobile_push_devices,public.mobile_push_deliveries TO service_role;

CREATE FUNCTION public.mobile_notification_available(n public.notifications)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path='' AS $$
DECLARE object_uuid uuid;
BEGIN
  IF NOT public.privacy_account_is_active(n.recipient_id) OR public.is_user_banned(n.recipient_id)
    OR NOT public.privacy_account_is_active(n.actor_id)
    OR (n.actor_id IS NOT NULL AND public.is_user_banned(n.actor_id))
    OR EXISTS(SELECT 1 FROM public.user_blocks b WHERE
      (b.blocker_id=n.recipient_id AND b.blocked_user_id=n.actor_id) OR
      (b.blocked_user_id=n.recipient_id AND b.blocker_id=n.actor_id)) THEN RETURN false; END IF;
  IF n.object_type='message' THEN
    RETURN EXISTS(SELECT 1 FROM public.messages m WHERE m.id::text=n.object_id
      AND (m.recipient_id=n.recipient_id OR m.sender_id=n.recipient_id));
  END IF;
  IF n.object_type IN ('post','reply','article') THEN
    IF n.object_id IS NULL OR n.object_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
    object_uuid:=n.object_id::uuid;
    IF n.object_type='article' THEN
      RETURN EXISTS(SELECT 1 FROM public.articles WHERE id=object_uuid AND deleted_at IS NULL AND published
        AND moderation_status='published' AND public.privacy_account_is_active(user_id));
    END IF;
    RETURN EXISTS(SELECT 1 FROM public.ap_objects o WHERE o.id=object_uuid AND public.privacy_object_is_active(o.id)
      AND o.moderation_status='published') OR (n.object_type='reply' AND EXISTS(
      SELECT 1 FROM public.post_replies r JOIN public.ap_objects o ON o.id=r.post_id
      WHERE r.id=object_uuid AND r.deleted_at IS NULL AND r.moderation_status='published'
        AND o.moderation_status='published' AND public.privacy_object_is_active(o.id)));
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.mobile_notification_available(public.notifications) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mobile_notification_available(public.notifications) TO service_role;

CREATE FUNCTION public.register_mobile_push(p_id uuid,p_user_id uuid,p_session_id uuid,p_platform text,p_hash text,p_ciphertext text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  -- Serialise registrations for one installation, including account switches.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,1));
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  IF NOT EXISTS(SELECT 1 FROM auth.sessions WHERE id=p_session_id AND user_id=p_user_id AND (not_after IS NULL OR not_after>now()))
    OR NOT public.privacy_account_is_active(p_user_id) OR public.is_user_banned(p_user_id) THEN
    RAISE EXCEPTION 'Active account and session required' USING ERRCODE='42501'; END IF;
  IF EXISTS(SELECT 1 FROM public.mobile_push_devices WHERE (id=p_id OR token_hash=p_hash) AND user_id<>p_user_id) THEN
    RAISE EXCEPTION 'Unregister the previous account first' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.mobile_push_devices WHERE id=p_id) AND
    (SELECT count(*) FROM public.mobile_push_devices WHERE user_id=p_user_id)>=10 THEN
    RAISE EXCEPTION 'Device limit reached' USING ERRCODE='23514'; END IF;
  DELETE FROM public.mobile_push_devices WHERE token_hash=p_hash AND id<>p_id AND user_id=p_user_id;
  -- Rotation or a new login must never inherit work claimed for an old token.
  DELETE FROM public.mobile_push_deliveries WHERE device_id=p_id AND EXISTS(
    SELECT 1 FROM public.mobile_push_devices WHERE id=p_id AND (token_hash<>p_hash OR session_id<>p_session_id));
  INSERT INTO public.mobile_push_devices(id,user_id,session_id,platform,token_hash,token_ciphertext)
    VALUES(p_id,p_user_id,p_session_id,p_platform,p_hash,p_ciphertext)
    ON CONFLICT(id) DO UPDATE SET session_id=EXCLUDED.session_id,platform=EXCLUDED.platform,
      token_hash=EXCLUDED.token_hash,token_ciphertext=EXCLUDED.token_ciphertext,updated_at=now(),expires_at=now()+interval '30 days';
END $$;
REVOKE ALL ON FUNCTION public.register_mobile_push(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_mobile_push(uuid,uuid,uuid,text,text,text) TO service_role;

CREATE FUNCTION public.queue_mobile_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT NEW.read AND public.mobile_notification_available(NEW) THEN
    INSERT INTO public.mobile_push_deliveries(device_id,notification_id)
      SELECT d.id,NEW.id FROM public.mobile_push_devices d JOIN auth.sessions s ON s.id=d.session_id
      WHERE d.user_id=NEW.recipient_id AND d.expires_at>now() AND (s.not_after IS NULL OR s.not_after>now())
      ON CONFLICT(device_id,notification_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.queue_mobile_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER queue_mobile_push AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.queue_mobile_push();

CREATE FUNCTION public.remove_deleted_account_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN DELETE FROM public.mobile_push_devices WHERE user_id=NEW.id; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.remove_deleted_account_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER remove_deleted_account_push AFTER UPDATE OF deleted_at ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.remove_deleted_account_push();

CREATE FUNCTION public.mobile_push_eligible(p_delivery_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT EXISTS(SELECT 1 FROM public.mobile_push_deliveries q
    JOIN public.mobile_push_devices d ON d.id=q.device_id JOIN auth.sessions s ON s.id=d.session_id
    JOIN public.notifications n ON n.id=q.notification_id
    WHERE q.id=p_delivery_id AND d.user_id=n.recipient_id AND s.user_id=d.user_id
      AND d.expires_at>now() AND (s.not_after IS NULL OR s.not_after>now())
      AND NOT n.read AND public.mobile_notification_available(n));
$$;
REVOKE ALL ON FUNCTION public.mobile_push_eligible(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.mobile_push_eligible(uuid) TO service_role;

CREATE FUNCTION public.claim_mobile_push(p_receipts boolean DEFAULT false,p_limit integer DEFAULT 20)
RETURNS SETOF public.mobile_push_deliveries LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  IF p_limit NOT BETWEEN 1 AND 50 THEN RAISE EXCEPTION 'Invalid batch size'; END IF;
  DELETE FROM public.mobile_push_devices WHERE expires_at<=now();
  DELETE FROM public.mobile_push_deliveries WHERE created_at<now()-interval '7 days';
  UPDATE public.mobile_push_deliveries SET state='failed',last_error='retry_limit',lease_id=NULL,lease_until=NULL
    WHERE (lease_until IS NULL OR lease_until<now()) AND (
      (state IN ('pending','sending') AND (attempts>=5 OR created_at<now()-interval '24 hours'))
      OR (state IN ('receipt','checking') AND (receipt_attempts>=8 OR created_at<now()-interval '23 hours')));
  RETURN QUERY UPDATE public.mobile_push_deliveries q SET
    state=CASE WHEN p_receipts THEN 'checking' ELSE 'sending' END,
    attempts=q.attempts+CASE WHEN p_receipts THEN 0 ELSE 1 END,
    receipt_attempts=q.receipt_attempts+CASE WHEN p_receipts THEN 1 ELSE 0 END,
    lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
    WHERE q.id IN (SELECT id FROM public.mobile_push_deliveries
      WHERE next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now())
      AND state=ANY(CASE WHEN p_receipts THEN ARRAY['receipt','checking'] ELSE ARRAY['pending','sending'] END)
      ORDER BY next_attempt_at,id FOR UPDATE SKIP LOCKED LIMIT p_limit)
    RETURNING q.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_mobile_push(boolean,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_mobile_push(boolean,integer) TO service_role;

-- Only the caller's current, policy-filtered inbox is exposed. No token columns.
CREATE FUNCTION public.mobile_notification_inbox(p_id uuid DEFAULT NULL,p_before timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid,type text,read boolean,created_at timestamptz,actor_id uuid,object_id text,object_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  RETURN QUERY SELECT n.id,n.type,n.read,n.created_at,n.actor_id,n.object_id,n.object_type
    FROM public.notifications n WHERE n.recipient_id=auth.uid() AND (p_id IS NULL OR n.id=p_id)
      AND (p_before IS NULL OR n.created_at<p_before OR (n.created_at=p_before AND n.id<p_before_id)) AND public.mobile_notification_available(n)
    ORDER BY n.created_at DESC,n.id DESC LIMIT 50;
END $$;
REVOKE ALL ON FUNCTION public.mobile_notification_inbox(uuid,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.mobile_notification_inbox(uuid,timestamptz,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
