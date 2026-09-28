-- Restored verbatim from the hosted migration ledger (version 20260201085158).
-- This version is already applied on the hosted backend; the file was missing from
-- the repository, so fresh installs lacked the article-covers/article-images buckets
-- and their owner-folder write policies. 20260922041921 later makes both buckets private.

-- Create storage bucket for article cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-covers', 'article-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for article inline images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for article-covers bucket
CREATE POLICY "Public can view article covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-covers');

CREATE POLICY "Authenticated users can upload article covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'article-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own article covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'article-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own article covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'article-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS policies for article-images bucket
CREATE POLICY "Public can view article images"
ON storage.objects FOR SELECT
USING (bucket_id = 'article-images');

CREATE POLICY "Authenticated users can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'article-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'article-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'article-images' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
