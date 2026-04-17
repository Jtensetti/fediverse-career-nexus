
-- A1: Lock down public storage bucket listing (public URL reads still work via bucket.public=true)
-- Drop overly broad SELECT policies that allow LIST on entire buckets
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view article covers" ON storage.objects;
DROP POLICY IF EXISTS "Public can view article images" ON storage.objects;
DROP POLICY IF EXISTS "Public view company assets" ON storage.objects;

-- Replace with owner-folder-only LIST access (public-URL reads bypass RLS for public buckets)
CREATE POLICY "Users can list own avatar folder"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can list own post images folder"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'posts' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can list own article covers folder"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-covers' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can list own article images folder"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'article-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can list own articles folder"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'articles' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Company members can list company assets folder"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'company-assets'
    AND safe_uuid((storage.foldername(name))[1]) IS NOT NULL
    AND has_company_role(
      auth.uid(),
      safe_uuid((storage.foldername(name))[1]),
      ARRAY['owner'::company_role, 'admin'::company_role, 'editor'::company_role]
    )
  );

-- A2: Tighten USING (true) write policies on internal/system tables to service-role only
DROP POLICY IF EXISTS "Authenticated users can update remote actors cache" ON public.remote_actors_cache;
CREATE POLICY "Service role manages remote actors cache (update)"
  ON public.remote_actors_cache FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage webfinger cache" ON public.webfinger_cache;
CREATE POLICY "Service role manages webfinger cache"
  ON public.webfinger_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- B3: Performance indexes for hot paths (non-blocking, idempotent)
CREATE INDEX IF NOT EXISTS idx_ap_objects_type_attributed_to
  ON public.ap_objects (type, attributed_to);

CREATE INDEX IF NOT EXISTS idx_ap_objects_published_at_desc
  ON public.ap_objects (published_at DESC NULLS LAST)
  WHERE type = 'Note';

CREATE INDEX IF NOT EXISTS idx_federation_queue_partition_status_priority
  ON public.federation_queue_partitioned (partition_key, status, priority DESC, created_at);

CREATE INDEX IF NOT EXISTS idx_federation_request_logs_host_timestamp
  ON public.federation_request_logs (remote_host, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_actor_followers_local_actor
  ON public.actor_followers (local_actor_id, status);

CREATE INDEX IF NOT EXISTS idx_company_followers_user
  ON public.company_followers (user_id);

CREATE INDEX IF NOT EXISTS idx_author_follows_follower
  ON public.author_follows (follower_id);

CREATE INDEX IF NOT EXISTS idx_author_follows_author
  ON public.author_follows (author_id);
