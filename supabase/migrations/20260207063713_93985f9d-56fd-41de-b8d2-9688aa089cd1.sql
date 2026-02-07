
-- Create company-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('company-assets', 'company-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public can view company assets
CREATE POLICY "Public view company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets');

-- Admins can upload company assets (folder = company_id)
CREATE POLICY "Admin upload company assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND public.safe_uuid((storage.foldername(name))[1]) IS NOT NULL
  AND public.has_company_role(
    auth.uid(),
    public.safe_uuid((storage.foldername(name))[1]),
    ARRAY['owner','admin']::public.company_role[]
  )
);

-- Admins can update company assets
CREATE POLICY "Admin update company assets"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND public.safe_uuid((storage.foldername(name))[1]) IS NOT NULL
  AND public.has_company_role(
    auth.uid(),
    public.safe_uuid((storage.foldername(name))[1]),
    ARRAY['owner','admin']::public.company_role[]
  )
);

-- Admins can delete company assets
CREATE POLICY "Admin delete company assets"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND public.safe_uuid((storage.foldername(name))[1]) IS NOT NULL
  AND public.has_company_role(
    auth.uid(),
    public.safe_uuid((storage.foldername(name))[1]),
    ARRAY['owner','admin']::public.company_role[]
  )
);
