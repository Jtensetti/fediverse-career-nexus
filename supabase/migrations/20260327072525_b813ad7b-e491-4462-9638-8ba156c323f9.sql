
-- 1. cv_sections: restrict SELECT to owner only
DROP POLICY IF EXISTS "Anyone can view cv sections" ON public.cv_sections;
CREATE POLICY "Users can view own cv sections"
  ON public.cv_sections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. user_achievements: remove unrestricted INSERT, add owner-only SELECT
DROP POLICY IF EXISTS "System can grant achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements"
  ON public.user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. remote_actors_cache: split ALL into granular policies
DROP POLICY IF EXISTS "Service can manage remote actors cache" ON public.remote_actors_cache;

CREATE POLICY "Anyone can read remote actors cache"
  ON public.remote_actors_cache FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert remote actors cache"
  ON public.remote_actors_cache FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update remote actors cache"
  ON public.remote_actors_cache FOR UPDATE
  TO authenticated
  USING (true);
