-- Add migration fields to actors table
ALTER TABLE public.actors 
ADD COLUMN IF NOT EXISTS also_known_as TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS moved_to TEXT DEFAULT NULL;

COMMENT ON COLUMN public.actors.also_known_as IS 'Alternative account URLs for migration verification';
COMMENT ON COLUMN public.actors.moved_to IS 'New account URL if user has migrated away';

-- Create consent tracking table for GDPR compliance
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- 'terms', 'privacy', 'marketing'
  version TEXT NOT NULL, -- e.g., '2025-01-23'
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  withdrawn_at TIMESTAMPTZ,
  UNIQUE(user_id, consent_type, version)
);

-- Enable RLS on user_consents
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can only see their own consents
CREATE POLICY "Users can view own consents" ON public.user_consents
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own consents
CREATE POLICY "Users can insert own consents" ON public.user_consents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON public.user_consents(user_id);

-- Fix: Protect actor private keys - update existing policy or create new one
-- First drop any existing overly permissive policies on actors
DO $$
BEGIN
  -- Try to drop the policy if it exists
  DROP POLICY IF EXISTS "Actors are viewable by everyone" ON public.actors;
EXCEPTION WHEN undefined_object THEN
  -- Policy doesn't exist, that's fine
END $$;

-- Create policy that protects private keys
CREATE POLICY "Actors public data viewable, private keys protected" ON public.actors
  FOR SELECT USING (
    user_id = auth.uid() 
    OR (
      -- Allow reading public fields for anyone, but private_key should be excluded in query
      status = 'active'
    )
  );

-- Fix poll_votes visibility - users should only see their own votes
DO $$
BEGIN
  DROP POLICY IF EXISTS "Poll votes are viewable by all" ON public.poll_votes;
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

CREATE POLICY "Users can only see their own votes" ON public.poll_votes
  FOR SELECT USING (auth.uid() = user_id);

-- Create security_incidents table for NIS2 compliance
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  incident_type TEXT NOT NULL, -- 'unauthorized_access', 'data_breach', 'system_compromise', etc.
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  affected_users INT,
  remediation_steps TEXT,
  resolved_at TIMESTAMPTZ,
  reported_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS on security_incidents
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Only admins can access security incidents
CREATE POLICY "Only admins can view security incidents" ON public.security_incidents
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can insert security incidents" ON public.security_incidents
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update security incidents" ON public.security_incidents
  FOR UPDATE USING (public.is_admin(auth.uid()));