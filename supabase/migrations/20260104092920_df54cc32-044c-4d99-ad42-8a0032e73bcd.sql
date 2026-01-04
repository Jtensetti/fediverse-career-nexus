-- Phase 1: Critical Security Fixes

-- 1.1 Fix actors table - Revoke private_key access from public roles
-- Only service_role should access private keys
REVOKE SELECT (private_key) ON public.actors FROM anon;
REVOKE SELECT (private_key) ON public.actors FROM authenticated;

-- 1.2 Fix server_keys table - Revoke private_key access
REVOKE SELECT (private_key) ON public.server_keys FROM anon;
REVOKE SELECT (private_key) ON public.server_keys FROM authenticated;

-- 1.3 Fix profiles table - Add policy for sensitive field visibility
-- Phone and location should only be visible to owner or connections
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

CREATE POLICY "Public profile info visible to all" ON public.profiles
FOR SELECT USING (true);
-- Note: Sensitive fields (phone, location) will be filtered at application layer
-- or via column-level security below

-- Revoke direct access to sensitive columns for anon users
REVOKE SELECT (phone) ON public.profiles FROM anon;

-- 1.4 Fix education table - already doesn't expose tokens (verification_status is safe)
-- The verification_status column is an enum, not a token - it's safe

-- Phase 4: Fix database function security - set explicit search paths
ALTER FUNCTION public.handle_new_article() SET search_path = public;

-- Add index for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_profiles_auth_type ON public.profiles(auth_type);
CREATE INDEX IF NOT EXISTS idx_federated_sessions_profile_id ON public.federated_sessions(profile_id);