-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view events based on visibility" ON public.events;

-- Create a new policy that allows public events to be viewed by everyone (including anonymous users)
CREATE POLICY "Anyone can view public events"
ON public.events
FOR SELECT
USING (
  -- Public events can be seen by everyone
  visibility = 'public'
  -- Or you own the event
  OR user_id = auth.uid()
  -- Or it's a connections-only event and you're connected
  OR (
    visibility = 'connections' 
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM user_connections
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND connected_user_id = events.user_id)
        OR (connected_user_id = auth.uid() AND user_id = events.user_id)
      )
    )
  )
  -- Or it's a private event and you're invited
  OR (
    visibility = 'private'
    AND auth.uid() IS NOT NULL
    AND is_user_invited_to_event(id, auth.uid())
  )
);