BEGIN;

-- Match the avatar update/delete boundary and the existing upload paths.
ALTER POLICY "Users can upload their own avatars" ON storage.objects
  TO authenticated
  WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1]=(SELECT auth.uid())::text);

-- These writes have required the authenticated server endpoints since September
-- 21. Remove obsolete policies as well as retaining the revoked table grants.
DROP POLICY IF EXISTS "Anyone can submit MFA recovery request" ON public.mfa_recovery_requests;
DROP POLICY IF EXISTS "Authenticated users can insert remote actors cache" ON public.remote_actors_cache;

-- Reactions, reply text and endorsements must not reveal a hidden parent.
-- Invoker subqueries reuse the parent's existing visibility/moderation policies.
CREATE POLICY "Read replies only with their post" ON public.post_replies
  AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS(SELECT 1 FROM public.ap_objects o WHERE o.id=post_id));
CREATE POLICY "Read reactions only with their target" ON public.reactions
  AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING ((target_type='post' AND EXISTS(SELECT 1 FROM public.ap_objects o WHERE o.id=target_id))
    OR (target_type='reply' AND EXISTS(SELECT 1 FROM public.post_replies r WHERE r.id=target_id)));
CREATE POLICY "Read article reactions only with their article" ON public.article_reactions
  AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS(SELECT 1 FROM public.articles a WHERE a.id=article_id));
CREATE POLICY "Read authors only with their article or own membership" ON public.article_authors
  AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (user_id=(SELECT auth.uid()) OR EXISTS(SELECT 1 FROM public.articles a WHERE a.id=article_id));
CREATE POLICY "Read endorsements only with their skill" ON public.skill_endorsements
  AS RESTRICTIVE FOR SELECT TO anon,authenticated
  USING (EXISTS(SELECT 1 FROM public.skills s WHERE s.id=skill_id));

COMMIT;
