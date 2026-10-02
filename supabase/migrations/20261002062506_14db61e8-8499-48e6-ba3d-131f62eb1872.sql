ALTER TABLE public.notification_digest_tracking
  ADD COLUMN IF NOT EXISTS last_digest_watermark timestamptz,
  ADD COLUMN IF NOT EXISTS claim_token uuid,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.claim_notification_digest(_user_id uuid, _claim uuid)
RETURNS TABLE(claimed boolean, watermark timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO notification_digest_tracking(user_id) VALUES (_user_id) ON CONFLICT (user_id) DO NOTHING;
  RETURN QUERY
  UPDATE notification_digest_tracking t
     SET claim_token = _claim, claimed_at = now()
   WHERE t.user_id = _user_id
     AND (t.claim_token IS NULL OR t.claimed_at < now() - interval '15 minutes')
     AND (t.last_digest_sent_at IS NULL OR t.last_digest_sent_at < now() - interval '36 hours')
     AND (t.last_failure_at IS NULL OR t.last_failure_at < now() - least(interval '1 hour' * power(2, least(t.failure_count, 6)), interval '48 hours'))
  RETURNING true, t.last_digest_watermark;
  IF NOT FOUND THEN RETURN QUERY SELECT false, NULL::timestamptz; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.finish_notification_digest(_user_id uuid, _claim uuid, _sent boolean, _watermark timestamptz)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _sent THEN
    UPDATE notification_digest_tracking
       SET claim_token = NULL, claimed_at = NULL, last_digest_sent_at = now(), last_notification_check_at = now(),
           last_digest_watermark = greatest(coalesce(last_digest_watermark, _watermark), _watermark), failure_count = 0, last_failure_at = NULL
     WHERE user_id = _user_id AND claim_token = _claim;
  ELSE
    UPDATE notification_digest_tracking
       SET claim_token = NULL, claimed_at = NULL, last_notification_check_at = now(),
           last_failure_at = CASE WHEN _watermark IS NULL THEN last_failure_at ELSE now() END,
           failure_count = CASE WHEN _watermark IS NULL THEN failure_count ELSE failure_count + 1 END
     WHERE user_id = _user_id AND claim_token = _claim;
  END IF;
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.claim_notification_digest(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_notification_digest(uuid, uuid, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_digest(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_notification_digest(uuid, uuid, boolean, timestamptz) TO service_role;