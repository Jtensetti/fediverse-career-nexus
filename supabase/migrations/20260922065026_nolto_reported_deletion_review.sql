BEGIN;

-- New sends already go through the encrypted, permission-checked server handler.
-- Remove the dormant legacy policy as well as its previously revoked INSERT grant.
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- Reports cannot be backdated or moved to another target to unlock an archive.
REVOKE INSERT, UPDATE ON public.content_reports FROM PUBLIC, anon, authenticated;
GRANT INSERT (reporter_id,content_type,content_id,reason,details) ON public.content_reports TO authenticated;
GRANT UPDATE (status,reviewed_at,reviewed_by) ON public.content_reports TO authenticated;

CREATE TABLE public.moderation_retention_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.deletion_requests(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.content_reports(id) ON DELETE CASCADE,
  moderator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accessed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moderation_retention_access ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moderation_retention_access FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.moderation_retention_access TO service_role;
CREATE INDEX moderation_retention_access_request_idx ON public.moderation_retention_access(request_id);
CREATE INDEX moderation_retention_access_report_idx ON public.moderation_retention_access(report_id);

-- Only the authenticated server handler may call this. It passes its verified user ID.
-- No general archive browser; a report must predate deletion and still be open.
CREATE FUNCTION public.read_reported_deleted_content(p_report_id uuid,p_moderator_id uuid)
RETURNS TABLE(kind text,subject_id uuid,encrypted_payload text,purge_after timestamptz)
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE report public.content_reports%ROWTYPE; request public.deletion_requests%ROWTYPE;
BEGIN
  IF p_moderator_id IS NULL OR NOT public.privacy_account_is_active(p_moderator_id) OR NOT public.is_moderator(p_moderator_id) THEN
    RAISE EXCEPTION 'Moderator access required' USING ERRCODE='42501';
  END IF;
  SELECT * INTO report FROM public.content_reports WHERE id=p_report_id FOR SHARE;
  IF NOT FOUND OR report.status NOT IN ('pending','reviewed') OR report.content_type NOT IN ('post','article') THEN
    RETURN;
  END IF;
  SELECT d.* INTO request FROM public.deletion_requests d
    WHERE d.kind=report.content_type AND d.subject_id::text=report.content_id
      AND d.requested_at>=report.created_at AND d.purge_after>clock_timestamp() AND d.state='pending'
    FOR SHARE;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.moderation_retention_access(request_id,report_id,moderator_id)
    VALUES(request.id,report.id,p_moderator_id);
  RETURN QUERY SELECT request.kind,request.subject_id,request.encrypted_payload,request.purge_after;
END $$;
REVOKE ALL ON FUNCTION public.read_reported_deleted_content(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_reported_deleted_content(uuid,uuid) TO service_role;

COMMIT;
