BEGIN;
ALTER TABLE public.content_review_decisions DROP CONSTRAINT content_review_decisions_action_check;
ALTER TABLE public.content_review_decisions ADD CONSTRAINT content_review_decisions_action_check CHECK(action IN ('approve','reject','appeal','context'));
CREATE UNIQUE INDEX one_context_per_revision ON public.content_review_decisions(content_kind,content_id,revision) WHERE action='context';

-- Explaining a pending submission must not consume the right to appeal a later rejection.
CREATE OR REPLACE FUNCTION public.decide_content_review(p_kind text,p_id uuid,p_revision uuid,p_action text,p_explanation text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE target text; current_revision uuid; current_status text;
BEGIN
  IF NOT public.current_session_is_verified() THEN RAISE EXCEPTION 'Verified session required' USING ERRCODE='42501'; END IF;
  IF p_action='appeal' THEN
    IF NOT public.moderation_is_owner(p_kind,p_id) THEN RAISE EXCEPTION 'Author required' USING ERRCODE='42501'; END IF;
  ELSIF p_action IN ('approve','reject') THEN
    IF NOT public.is_moderator(auth.uid()) OR public.moderation_is_owner(p_kind,p_id) THEN
      RAISE EXCEPTION 'Another moderator must review this content' USING ERRCODE='42501'; END IF;
  ELSE RAISE EXCEPTION 'Unknown review action' USING ERRCODE='22023'; END IF;
  target:=CASE p_kind WHEN 'post' THEN 'ap_objects' WHEN 'article' THEN 'articles' WHEN 'comment' THEN 'post_replies' END;
  IF target IS NULL THEN RAISE EXCEPTION 'Unknown content kind' USING ERRCODE='22023'; END IF;
  EXECUTE format('SELECT moderation_revision,moderation_status FROM public.%I WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',target)
    INTO current_revision,current_status USING p_id;
  IF current_revision IS DISTINCT FROM p_revision OR current_status='published' OR (p_action<>'appeal' AND current_status<>'pending') THEN
    RAISE EXCEPTION 'Content changed; reload the review' USING ERRCODE='40001'; END IF;
  INSERT INTO public.content_review_decisions(content_kind,content_id,revision,actor_id,action,explanation)
    VALUES(p_kind,p_id,p_revision,auth.uid(),CASE WHEN p_action='appeal' AND current_status='pending' THEN 'context' ELSE p_action END,btrim(p_explanation));
  EXECUTE format('UPDATE public.%I SET moderation_status=$1 WHERE id=$2',target)
    USING CASE p_action WHEN 'approve' THEN 'published' WHEN 'reject' THEN 'rejected' ELSE 'pending' END,p_id;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
