-- Track blocked ActivityPub actors
CREATE TABLE IF NOT EXISTS public.blocked_actors (
  actor_url TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'blocked',
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

ALTER TABLE public.blocked_actors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blocked_actors" ON public.blocked_actors
  USING (is_admin(auth.uid()));
