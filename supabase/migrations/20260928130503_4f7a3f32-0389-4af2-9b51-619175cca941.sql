DROP POLICY IF EXISTS "Article owners can add authors" ON public.article_authors;
DROP POLICY IF EXISTS "Article owners can update collaborators" ON public.article_authors;
DROP POLICY IF EXISTS "Owners remove collaborators or collaborators leave" ON public.article_authors;
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