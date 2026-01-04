-- Fix the server_public_keys view to use security_invoker
DROP VIEW IF EXISTS public.server_public_keys;
CREATE VIEW public.server_public_keys
WITH (security_invoker = true)
AS
SELECT id, public_key, is_current, created_at
FROM public.server_keys
WHERE is_current = true AND revoked_at IS NULL;

-- Re-grant access to the safe view
GRANT SELECT ON public.server_public_keys TO anon, authenticated;