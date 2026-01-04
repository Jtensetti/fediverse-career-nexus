-- Create OAuth clients table to store dynamically registered OAuth clients
CREATE TABLE public.oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_domain TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  scopes TEXT DEFAULT 'read',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;

-- Only service role can manage OAuth clients (edge functions)
CREATE POLICY "Service role can manage oauth_clients" ON public.oauth_clients
FOR ALL USING (true);

-- Create federated sessions table
CREATE TABLE public.federated_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  remote_actor_url TEXT NOT NULL,
  remote_instance TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, remote_instance)
);

-- Enable RLS
ALTER TABLE public.federated_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sessions
CREATE POLICY "Users can view own federated sessions" ON public.federated_sessions
FOR SELECT USING (auth.uid() = profile_id);

-- Service role manages sessions
CREATE POLICY "Service role can manage federated_sessions" ON public.federated_sessions
FOR ALL USING (true);

-- Add federated auth columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auth_type TEXT DEFAULT 'local' CHECK (auth_type IN ('local', 'federated')),
ADD COLUMN IF NOT EXISTS remote_actor_url TEXT,
ADD COLUMN IF NOT EXISTS home_instance TEXT;

-- Add remote actor columns to actors
ALTER TABLE public.actors
ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remote_actor_url TEXT,
ADD COLUMN IF NOT EXISTS remote_inbox_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_remote_actor ON public.profiles(remote_actor_url) WHERE remote_actor_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_federated_sessions_profile ON public.federated_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_domain ON public.oauth_clients(instance_domain);