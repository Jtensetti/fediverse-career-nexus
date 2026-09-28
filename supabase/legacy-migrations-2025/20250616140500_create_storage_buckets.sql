
-- Create avatars bucket for profile images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create posts bucket for post images  
INSERT INTO storage.buckets (id, name, public) 
VALUES ('posts', 'posts', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Set up RLS policies for posts bucket
CREATE POLICY "Users can upload post images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'posts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view post images" ON storage.objects
FOR SELECT USING (bucket_id = 'posts');

CREATE POLICY "Users can update their own post images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'posts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own post images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'posts' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);
