-- Local stand-in for Storage metadata and its existing permissive read policy.
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text NOT NULL,public boolean DEFAULT false,file_size_limit bigint,allowed_mime_types text[]);
INSERT INTO storage.buckets(id,name,public) SELECT x,x,true FROM unnest(ARRAY['avatars','posts','articles','article-covers','article-images','company-assets']) x;
GRANT ALL ON storage.objects,storage.buckets TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;
CREATE POLICY fixture_read ON storage.objects FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY fixture_write ON storage.objects FOR ALL TO authenticated USING(owner=auth.uid()) WITH CHECK(owner=auth.uid());

-- Supabase's folder helper and the deployed pre-hardening avatar policy are
-- platform/schema inputs, not supplied by the privacy migration itself.
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS
$$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT
  WITH CHECK(bucket_id='avatars' AND auth.uid() IS NOT NULL);
