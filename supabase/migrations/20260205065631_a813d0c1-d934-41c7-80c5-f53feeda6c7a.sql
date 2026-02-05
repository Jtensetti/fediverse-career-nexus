-- Create update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create site_alerts table for site-wide announcements
CREATE TABLE public.site_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'success' CHECK (type IN ('error', 'success')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_alerts ENABLE ROW LEVEL SECURITY;

-- Everyone can read active alerts (for displaying banners)
CREATE POLICY "Anyone can view active alerts"
ON public.site_alerts
FOR SELECT
USING (is_active = true);

-- Only admins/moderators can manage alerts
CREATE POLICY "Admins can manage alerts"
ON public.site_alerts
FOR ALL
TO authenticated
USING (
    public.is_admin(auth.uid()) OR public.is_moderator(auth.uid())
)
WITH CHECK (
    public.is_admin(auth.uid()) OR public.is_moderator(auth.uid())
);

-- Update timestamp trigger
CREATE TRIGGER update_site_alerts_updated_at
BEFORE UPDATE ON public.site_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();