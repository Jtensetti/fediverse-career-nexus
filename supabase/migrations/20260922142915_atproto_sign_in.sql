BEGIN;

-- The DID is the identity. Handles and email addresses are never account keys.
CREATE TABLE public.atproto_identities (
  did text PRIMARY KEY CHECK(length(did) BETWEEN 10 AND 2048 AND did ~ '^did:(plc|web):'),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.atproto_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atproto_identities FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.atproto_identities TO authenticated;
GRANT ALL ON public.atproto_identities TO service_role;
CREATE POLICY "Read own AT Protocol identity" ON public.atproto_identities FOR SELECT TO authenticated
  USING(user_id=(SELECT auth.uid()) AND (SELECT public.current_session_is_verified()));

CREATE TABLE public.atproto_oauth_states (
  state_hash text PRIMARY KEY CHECK(state_hash ~ '^[a-f0-9]{64}$'),
  browser_proof_hash text NOT NULL CHECK(browser_proof_hash ~ '^[a-f0-9]{64}$'),
  encrypted_state text NOT NULL CHECK(encrypted_state LIKE 'v2:%' AND length(encrypted_state)<100000),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '10 minutes')
);
CREATE TABLE public.atproto_auth_locks (
  key_hash text PRIMARY KEY,
  lease_id uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '1 minute')
);
ALTER TABLE public.atproto_oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atproto_auth_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.atproto_oauth_states,public.atproto_auth_locks FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.atproto_oauth_states,public.atproto_auth_locks TO service_role;
CREATE INDEX atproto_states_expiry ON public.atproto_oauth_states(expires_at);

CREATE FUNCTION public.claim_atproto_lock(p_key text,p_lease uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
  INSERT INTO public.atproto_auth_locks(key_hash,lease_id) VALUES(p_key,p_lease)
  ON CONFLICT(key_hash) DO UPDATE SET lease_id=excluded.lease_id,expires_at=now()+interval '1 minute'
    WHERE public.atproto_auth_locks.expires_at<now();
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_atproto_lock(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_atproto_lock(text,uuid) TO service_role;

-- Also checked at consumption; expired state can never authorize a login.
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule('nolto-atproto-state-cleanup','*/10 * * * *',
      'DELETE FROM public.atproto_oauth_states WHERE expires_at<now(); DELETE FROM public.atproto_auth_locks WHERE expires_at<now();');
  END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
