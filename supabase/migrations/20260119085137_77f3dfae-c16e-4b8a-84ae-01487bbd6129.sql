
-- ============================================
-- CRITICAL SECURITY FIX: Protect Private Keys and Secrets
-- ============================================

-- 1. DROP the overly permissive SELECT policy on actors that exposes private_key
DROP POLICY IF EXISTS "Anyone can view actors" ON public.actors;

-- 2. Create a view that hides sensitive columns from actors (private_key)
DROP VIEW IF EXISTS public.public_actors;
CREATE VIEW public.public_actors AS
SELECT 
  id,
  preferred_username,
  type,
  status,
  follower_count,
  following_count,
  is_remote,
  remote_actor_url,
  remote_inbox_url,
  user_id,
  public_key,
  created_at,
  updated_at
FROM public.actors;

-- Grant SELECT on the view to authenticated and anon users
GRANT SELECT ON public.public_actors TO authenticated;
GRANT SELECT ON public.public_actors TO anon;

-- 3. Create proper RLS policy for actors table - users can only see their own full record
CREATE POLICY "Users can view own actor" 
ON public.actors 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Create a SECURITY DEFINER function to safely get private key (only for actor owner)
CREATE OR REPLACE FUNCTION public.get_actor_private_key(actor_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT private_key FROM actors 
  WHERE id = actor_uuid 
  AND user_id = auth.uid();
$$;

-- 5. Create a function for edge functions to get private key using service role
CREATE OR REPLACE FUNCTION public.get_actor_private_key_service(actor_uuid uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT private_key FROM actors 
  WHERE id = actor_uuid;
$$;

-- 6. Fix OAuth clients - the "ALL" policy with true is dangerous
DROP POLICY IF EXISTS "Service role can manage oauth_clients" ON public.oauth_clients;
DROP POLICY IF EXISTS "Anyone can view oauth_clients" ON public.oauth_clients;

-- Creating a restrictive policy that only allows admins to view
CREATE POLICY "Only admins can view oauth_clients" 
ON public.oauth_clients 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- 7. Fix federated_sessions - remove overly permissive "ALL" policy
DROP POLICY IF EXISTS "Service role can manage federated_sessions" ON public.federated_sessions;

-- Add proper user-scoped policies
CREATE POLICY "Users can insert own federated sessions" 
ON public.federated_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own federated sessions" 
ON public.federated_sessions 
FOR UPDATE 
USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete own federated sessions" 
ON public.federated_sessions 
FOR DELETE 
USING (auth.uid() = profile_id);

-- 8. Fix function search_path issues flagged by linter
CREATE OR REPLACE FUNCTION public.get_batch_boost_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid, boost_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    (content->'object'->>'id')::uuid as post_id,
    COUNT(*) as boost_count
  FROM ap_objects
  WHERE type = 'Announce'
    AND (content->'object'->>'id')::uuid = ANY(post_ids)
  GROUP BY (content->'object'->>'id')::uuid
$$;

CREATE OR REPLACE FUNCTION public.get_batch_reply_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid, reply_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT 
    COALESCE(
      (content->>'rootPost')::uuid,
      (content->>'inReplyTo')::uuid
    ) as post_id,
    COUNT(*) as reply_count
  FROM ap_objects
  WHERE type = 'Note'
    AND content->>'inReplyTo' IS NOT NULL
    AND (
      (content->>'rootPost')::uuid = ANY(post_ids)
      OR (content->>'inReplyTo')::uuid = ANY(post_ids)
    )
  GROUP BY COALESCE(
    (content->>'rootPost')::uuid,
    (content->>'inReplyTo')::uuid
  )
$$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;
