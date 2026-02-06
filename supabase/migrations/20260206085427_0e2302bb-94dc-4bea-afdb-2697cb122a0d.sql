-- WebFinger cache (separate from remote_actors_cache)
-- Maps acct:user@domain -> actor_url for 1-hour TTL
CREATE TABLE IF NOT EXISTS webfinger_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acct TEXT UNIQUE NOT NULL,           -- e.g., "user@mastodon.social"
  actor_url TEXT NOT NULL,             -- resolved actor URL
  inbox_url TEXT,                      -- cached inbox URL for direct delivery
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_webfinger_acct ON webfinger_cache(acct);
CREATE INDEX IF NOT EXISTS idx_webfinger_expires ON webfinger_cache(expires_at);

-- Enable RLS but allow service role access
ALTER TABLE webfinger_cache ENABLE ROW LEVEL SECURITY;

-- Service role policy for Edge Functions
CREATE POLICY "Service role can manage webfinger cache"
ON webfinger_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Add comment to queue_delete_for_federation trigger for documentation
COMMENT ON FUNCTION queue_delete_for_federation IS 
'FEDERATION DELETE HANDLER: This trigger returns NULL to intercept and cancel DELETE operations.
The row is preserved as a Tombstone for ActivityPub compliance (RFC 7231).
To hard delete, bypass this trigger or use: SET LOCAL app.bypass_tombstone = true;';