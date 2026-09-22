BEGIN;

CREATE TABLE public.message_public_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key text NOT NULL CHECK (length(public_key) BETWEEN 100 AND 16384),
  fingerprint text NOT NULL UNIQUE CHECK (fingerprint ~ '^[a-f0-9]{40,64}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.message_key_backups (
  user_id uuid PRIMARY KEY REFERENCES public.message_public_keys(user_id) ON DELETE CASCADE,
  encrypted_private_key text NOT NULL CHECK (length(encrypted_private_key) BETWEEN 100 AND 32768),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.message_public_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_key_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_public_keys, public.message_key_backups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.message_public_keys, public.message_key_backups TO authenticated;
GRANT ALL ON public.message_public_keys, public.message_key_backups TO service_role;
CREATE POLICY "Verified users read public message keys" ON public.message_public_keys FOR SELECT TO authenticated
  USING ((SELECT public.current_session_is_verified()));
CREATE POLICY "Owners read encrypted key backups" ON public.message_key_backups FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.current_session_is_verified()));

-- Key registration is validated by the message-keys handler. Keys are immutable;
-- neither a profile update nor a password reset may silently replace a peer's key.
CREATE FUNCTION public.register_message_keys(p_user_id uuid, p_public_key text, p_private_key text, p_fingerprint text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.message_public_keys(user_id, public_key, fingerprint) VALUES(p_user_id, p_public_key, p_fingerprint);
  INSERT INTO public.message_key_backups(user_id, encrypted_private_key) VALUES(p_user_id, p_private_key);
END $$;
REVOKE ALL ON FUNCTION public.register_message_keys(uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_message_keys(uuid,text,text,text) TO service_role;

ALTER TABLE public.messages ADD COLUMN encryption_version text NOT NULL DEFAULT 'server-v2';
ALTER TABLE public.messages ADD COLUMN sender_key_fingerprint text;
ALTER TABLE public.messages ADD COLUMN recipient_key_fingerprint text;
CREATE FUNCTION public.enforce_private_message_envelope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.encryption_version <> 'openpgp-v1' OR NEW.is_encrypted IS DISTINCT FROM true OR NEW.content <> ''
    OR NEW.encrypted_content IS NULL OR length(NEW.encrypted_content) NOT BETWEEN 100 AND 65536
    OR NEW.encrypted_content NOT LIKE '-----BEGIN PGP MESSAGE-----%'
    OR NEW.sender_id = NEW.recipient_id
    OR NOT EXISTS (SELECT 1 FROM public.message_public_keys WHERE user_id=NEW.sender_id AND fingerprint=NEW.sender_key_fingerprint)
    OR NOT EXISTS (SELECT 1 FROM public.message_public_keys WHERE user_id=NEW.recipient_id AND fingerprint=NEW.recipient_key_fingerprint)
  THEN RAISE EXCEPTION 'A valid end-to-end encrypted message is required' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_private_message_envelope() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_private_message_envelope BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_private_message_envelope();

-- A request to start a conversation carries no private message preview.
UPDATE public.message_requests SET preview_text=NULL, intro_template=NULL;
ALTER TABLE public.message_requests ADD CONSTRAINT message_request_without_plaintext
  CHECK(preview_text IS NULL AND intro_template IS NULL);

-- Visiting a profile is not an event that Nolto needs to retain.
REVOKE ALL ON public.profile_views FROM PUBLIC,anon,authenticated;
DELETE FROM public.profile_views;
UPDATE public.profiles SET profile_views=0;
CREATE FUNCTION public.reject_profile_tracking() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'Profile visit tracking is disabled' USING ERRCODE='0A000'; END $$;
REVOKE ALL ON FUNCTION public.reject_profile_tracking() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER reject_profile_tracking BEFORE INSERT ON public.profile_views
  FOR EACH ROW EXECUTE FUNCTION public.reject_profile_tracking();

UPDATE public.user_consents SET ip_address=NULL, user_agent=NULL;
ALTER TABLE public.user_consents ADD CONSTRAINT consent_without_device_identifiers CHECK(ip_address IS NULL AND user_agent IS NULL);
UPDATE public.mfa_recovery_requests SET ip_address=NULL, user_agent=NULL;
ALTER TABLE public.mfa_recovery_requests ADD CONSTRAINT recovery_without_device_identifiers CHECK(ip_address IS NULL AND user_agent IS NULL);
ALTER TABLE public.profiles ALTER COLUMN email_digest_enabled SET DEFAULT false;

COMMIT;
