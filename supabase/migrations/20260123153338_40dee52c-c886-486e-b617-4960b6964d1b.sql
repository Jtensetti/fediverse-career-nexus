-- Create user_bans table for temporary and permanent bans
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID,
  UNIQUE(user_id, created_at)
);

-- Enable RLS
ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

-- RLS policies for bans table
CREATE POLICY "Moderators can view bans"
ON public.user_bans FOR SELECT
USING (public.is_moderator(auth.uid()));

CREATE POLICY "Moderators can create bans"
ON public.user_bans FOR INSERT
WITH CHECK (public.is_moderator(auth.uid()));

CREATE POLICY "Moderators can update bans"
ON public.user_bans FOR UPDATE
USING (public.is_moderator(auth.uid()));

-- Add columns to moderation_actions for better tracking
ALTER TABLE public.moderation_actions 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS target_content_type TEXT,
ADD COLUMN IF NOT EXISTS target_content_id TEXT;

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION public.is_user_banned(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_bans
    WHERE user_id = check_user_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Index for efficient ban lookups
CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON public.user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON public.user_bans(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON public.content_reports(status);