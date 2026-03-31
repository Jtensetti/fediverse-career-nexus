-- 1. Fix avatar storage policies: add path ownership checks
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. Fix posts bucket upload policy: add path ownership check
DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;

CREATE POLICY "Users can upload post images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'posts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Fix notifications INSERT policy: restrict to service_role only
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

CREATE POLICY "System can create notifications" ON public.notifications
FOR INSERT WITH CHECK (
  (auth.jwt()->>'role') = 'service_role'
);

-- 4. Fix webfinger_cache: replace open ALL policy with scoped policies
DROP POLICY IF EXISTS "Allow public read/write access to webfinger cache" ON public.webfinger_cache;

CREATE POLICY "Anyone can read webfinger cache" ON public.webfinger_cache
FOR SELECT USING (true);

CREATE POLICY "Only service role can write webfinger cache" ON public.webfinger_cache
FOR INSERT WITH CHECK (
  (auth.jwt()->>'role') = 'service_role'
);

CREATE POLICY "Only service role can update webfinger cache" ON public.webfinger_cache
FOR UPDATE USING (
  (auth.jwt()->>'role') = 'service_role'
);

CREATE POLICY "Only service role can delete webfinger cache" ON public.webfinger_cache
FOR DELETE USING (
  (auth.jwt()->>'role') = 'service_role'
);