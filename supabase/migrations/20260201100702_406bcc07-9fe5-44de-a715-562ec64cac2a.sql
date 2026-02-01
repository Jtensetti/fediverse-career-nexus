-- Allow authenticated users to upload their own article images
CREATE POLICY "Users can upload article images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'articles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to update their own article images
CREATE POLICY "Users can update their article images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'articles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete their own article images
CREATE POLICY "Users can delete their article images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'articles' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);