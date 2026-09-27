CREATE TABLE public.ip_blocks (
  ip_hash text PRIMARY KEY CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  reason text NOT NULL CHECK (char_length(reason) <= 120),
  hit_count integer NOT NULL DEFAULT 1,
  last_hit_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.ip_blocks TO authenticated;
GRANT ALL ON public.ip_blocks TO service_role;
ALTER TABLE public.ip_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators view IP blocks" ON public.ip_blocks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Moderators lift IP blocks" ON public.ip_blocks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE TABLE public.instance_auto_blocks (
  host text PRIMARY KEY CHECK (char_length(host) <= 253),
  reason text NOT NULL CHECK (char_length(reason) <= 120),
  offense_count integer NOT NULL DEFAULT 1,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  strikes integer NOT NULL DEFAULT 0,
  blocked_until timestamptz,
  flagged_only boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.instance_auto_blocks TO authenticated;
GRANT ALL ON public.instance_auto_blocks TO service_role;
ALTER TABLE public.instance_auto_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Moderators view instance auto blocks" ON public.instance_auto_blocks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Moderators lift instance auto blocks" ON public.instance_auto_blocks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Honeypot hit: 24h first time, 7 days when repeated within 30 days.
CREATE OR REPLACE FUNCTION public.record_honeypot_hit(p_ip_hash text, p_reason text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result timestamptz;
BEGIN
  INSERT INTO ip_blocks AS b (ip_hash, reason, blocked_until)
  VALUES (p_ip_hash, left(p_reason, 120), now() + interval '24 hours')
  ON CONFLICT (ip_hash) DO UPDATE SET
    hit_count = b.hit_count + 1,
    reason = left(p_reason, 120),
    blocked_until = greatest(b.blocked_until, now() + CASE WHEN b.last_hit_at > now() - interval '30 days' THEN interval '7 days' ELSE interval '24 hours' END),
    last_hit_at = now()
  RETURNING blocked_until INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.ip_block_until(p_ip_hash text)
RETURNS timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT blocked_until FROM ip_blocks WHERE ip_hash = p_ip_hash AND blocked_until > now()
$$;

-- Counts verified offenses from one server in a 10-minute window.
CREATE OR REPLACE FUNCTION public.record_instance_offense(p_host text, p_reason text, p_threshold integer, p_protected boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r instance_auto_blocks;
BEGIN
  INSERT INTO instance_auto_blocks AS a (host, reason)
  VALUES (lower(p_host), left(p_reason, 120))
  ON CONFLICT (host) DO UPDATE SET
    offense_count = CASE WHEN a.window_started_at < now() - interval '10 minutes' THEN 1 ELSE a.offense_count + 1 END,
    window_started_at = CASE WHEN a.window_started_at < now() - interval '10 minutes' THEN now() ELSE a.window_started_at END,
    reason = left(p_reason, 120), updated_at = now()
  RETURNING * INTO r;
  IF r.offense_count >= p_threshold AND (r.blocked_until IS NULL OR r.blocked_until <= now()) AND NOT r.flagged_only THEN
    IF p_protected THEN
      UPDATE instance_auto_blocks SET flagged_only = true WHERE host = r.host;
      RETURN false;
    END IF;
    UPDATE instance_auto_blocks SET
      strikes = r.strikes + 1,
      blocked_until = now() + CASE WHEN r.strikes > 0 AND r.updated_at > now() - interval '30 days' THEN interval '7 days' ELSE interval '24 hours' END,
      offense_count = 0
    WHERE host = r.host;
    RETURN true;
  END IF;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.instance_auto_blocked(p_host text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM instance_auto_blocks WHERE host = lower(p_host) AND blocked_until > now())
$$;

REVOKE ALL ON FUNCTION public.record_honeypot_hit(text, text), public.ip_block_until(text),
  public.record_instance_offense(text, text, integer, boolean), public.instance_auto_blocked(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_honeypot_hit(text, text), public.ip_block_until(text),
  public.record_instance_offense(text, text, integer, boolean), public.instance_auto_blocked(text) TO service_role;