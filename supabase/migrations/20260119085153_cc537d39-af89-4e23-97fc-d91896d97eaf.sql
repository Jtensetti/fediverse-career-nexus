
-- Fix SECURITY DEFINER view issue by using SECURITY INVOKER (default)
DROP VIEW IF EXISTS public.public_actors;
CREATE VIEW public.public_actors 
WITH (security_invoker = true)
AS
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

GRANT SELECT ON public.public_actors TO authenticated;
GRANT SELECT ON public.public_actors TO anon;

-- Also need to allow public to read from actors via the view
-- Since RLS blocks direct access, we need a policy that allows SELECT through view
-- Drop the user-only policy and create one that allows reading public columns
DROP POLICY IF EXISTS "Users can view own actor" ON public.actors;

-- Create a policy that allows anyone to SELECT (but private_key is hidden via the view)
CREATE POLICY "Public can view actor public info" 
ON public.actors 
FOR SELECT 
USING (true);
