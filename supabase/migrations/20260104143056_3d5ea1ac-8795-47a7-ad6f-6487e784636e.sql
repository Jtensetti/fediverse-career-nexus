-- Fix Events RLS infinite recursion by creating a SECURITY DEFINER function
CREATE OR REPLACE FUNCTION are_users_connected_secure(user1 uuid, user2 uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_connections
    WHERE status = 'accepted'
    AND ((user_id = user1 AND connected_user_id = user2)
      OR (user_id = user2 AND connected_user_id = user1))
  );
$$;

-- Add verification_token column to education table
ALTER TABLE education ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Add verification_token column to experiences table  
ALTER TABLE experiences ADD COLUMN IF NOT EXISTS verification_token TEXT;

-- Update events RLS policy to use the secure function
DROP POLICY IF EXISTS "Users can view events based on visibility" ON events;
CREATE POLICY "Users can view events based on visibility" ON events
FOR SELECT USING (
  auth.uid() = user_id 
  OR visibility = 'public'
  OR (visibility = 'connections' AND are_users_connected_secure(auth.uid(), user_id))
  OR (visibility = 'private' AND EXISTS (
    SELECT 1 FROM event_invitations 
    WHERE event_invitations.event_id = events.id 
    AND event_invitations.user_id = auth.uid()
  ))
);