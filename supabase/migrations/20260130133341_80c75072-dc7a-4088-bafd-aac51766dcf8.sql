-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own connections" ON public.user_connections;

-- Create a new policy that allows viewing all accepted connections
-- This enables the connections tab on profiles to show other users' connections
CREATE POLICY "Anyone can view accepted connections"
ON public.user_connections
FOR SELECT
USING (status = 'accepted');

-- Create a separate policy for viewing own pending connections
CREATE POLICY "Users can view their own pending connections"
ON public.user_connections
FOR SELECT
USING (
  status = 'pending' AND (auth.uid() = user_id OR auth.uid() = connected_user_id)
);