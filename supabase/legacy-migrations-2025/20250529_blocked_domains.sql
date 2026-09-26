-- Track blocked domains for federation
CREATE TABLE IF NOT EXISTS public.blocked_domains (
  host TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'blocked',
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID NULL
);

ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blocked_domains" ON public.blocked_domains
  USING (is_admin(auth.uid()));
