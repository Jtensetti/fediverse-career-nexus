-- Add manually_approves_followers to actors (defaults false for backwards compat)
ALTER TABLE public.actors 
ADD COLUMN IF NOT EXISTS manually_approves_followers boolean NOT NULL DEFAULT false;

-- Atomic key generation function with advisory lock to prevent race conditions
CREATE OR REPLACE FUNCTION public.ensure_actor_keys(
  actor_uuid uuid,
  new_private_key text,
  new_public_key text
)
RETURNS TABLE(private_key text, public_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lock_key bigint;
  existing_priv text;
  existing_pub text;
BEGIN
  -- Derive a stable bigint lock key from the uuid
  lock_key := ('x' || substr(md5(actor_uuid::text), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT a.private_key, a.public_key INTO existing_priv, existing_pub
  FROM public.actors a WHERE a.id = actor_uuid FOR UPDATE;

  IF existing_priv IS NOT NULL AND existing_pub IS NOT NULL THEN
    RETURN QUERY SELECT existing_priv, existing_pub;
    RETURN;
  END IF;

  UPDATE public.actors
  SET private_key = new_private_key,
      public_key = new_public_key,
      updated_at = now()
  WHERE id = actor_uuid
  RETURNING actors.private_key, actors.public_key INTO existing_priv, existing_pub;

  RETURN QUERY SELECT existing_priv, existing_pub;
END;
$$;

-- Replay protection cache for HTTP signatures
CREATE TABLE IF NOT EXISTS public.federation_signature_cache (
  signature_hash text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.federation_signature_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage signature cache"
ON public.federation_signature_cache
FOR ALL
USING (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fed_sig_cache_created_at 
ON public.federation_signature_cache(created_at);

-- Cleanup function to be called periodically
CREATE OR REPLACE FUNCTION public.cleanup_federation_signature_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.federation_signature_cache
  WHERE created_at < now() - interval '15 minutes';
$$;