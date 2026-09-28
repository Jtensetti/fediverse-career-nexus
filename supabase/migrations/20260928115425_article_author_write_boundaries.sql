BEGIN;

-- Self-membership must never grant edit/review ownership of another article.
-- Keep the existing public/own-membership SELECT, session and deletion policies.
DROP POLICY IF EXISTS "Article owners can manage authors" ON public.article_authors;

CREATE POLICY "Article owners can add authors"
ON public.article_authors FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.articles a
    WHERE a.id=article_authors.article_id AND a.user_id=(SELECT auth.uid()))
  AND (
    (user_id=(SELECT auth.uid()) AND is_primary IS TRUE AND can_edit IS TRUE)
    OR (user_id<>(SELECT auth.uid()) AND is_primary IS NOT TRUE)
  )
);

-- The owner's primary membership is established by the article-creation trigger
-- (or its existing client fallback), not reassigned through collaborator updates.
CREATE POLICY "Article owners can update collaborators"
ON public.article_authors FOR UPDATE TO authenticated
USING (
  is_primary IS NOT TRUE
  AND EXISTS (SELECT 1 FROM public.articles a
    WHERE a.id=article_authors.article_id AND a.user_id=(SELECT auth.uid()))
)
WITH CHECK (
  is_primary IS NOT TRUE AND user_id<>(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.articles a
    WHERE a.id=article_authors.article_id AND a.user_id=(SELECT auth.uid()))
);

-- An owner may remove a collaborator, and a collaborator may leave voluntarily.
-- Neither path deletes the primary attribution needed by the article editor.
CREATE POLICY "Owners remove collaborators or collaborators leave"
ON public.article_authors FOR DELETE TO authenticated
USING (
  is_primary IS NOT TRUE
  AND (
    user_id=(SELECT auth.uid())
    OR EXISTS (SELECT 1 FROM public.articles a
      WHERE a.id=article_authors.article_id AND a.user_id=(SELECT auth.uid()))
  )
);

COMMIT;

