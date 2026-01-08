-- Fix events RLS policy to prevent infinite recursion
-- The current policy uses are_users_connected_secure which causes infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view events based on visibility" ON events;

-- Create a simpler, non-recursive policy for events
CREATE POLICY "Users can view events based on visibility" ON events
FOR SELECT
USING (
  -- User is the event creator
  auth.uid() = user_id
  OR 
  -- Event is public
  visibility = 'public'
  OR 
  -- Event is for connections and viewer is connected to the creator
  (
    visibility = 'connections' 
    AND EXISTS (
      SELECT 1 FROM user_connections 
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND connected_user_id = events.user_id)
        OR (connected_user_id = auth.uid() AND user_id = events.user_id)
      )
    )
  )
  OR 
  -- Event is private but user is invited
  (
    visibility = 'private' 
    AND EXISTS (
      SELECT 1 FROM event_invitations 
      WHERE event_invitations.event_id = events.id 
      AND event_invitations.user_id = auth.uid()
    )
  )
);