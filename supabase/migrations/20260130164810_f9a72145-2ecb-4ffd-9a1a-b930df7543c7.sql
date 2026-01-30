-- Fix cleanup_expired_reset_codes function to have search_path set
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.password_reset_codes 
  WHERE expires_at < now() OR used = true;
END;
$$;