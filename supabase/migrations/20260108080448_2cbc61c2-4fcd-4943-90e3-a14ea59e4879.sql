-- Fix infinite RLS recursion between events and event_invitations

-- Step 1: Create helper function to get event owner (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_event_owner(p_event_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT user_id FROM public.events WHERE id = p_event_id;
$$;

-- Step 2: Create helper function to check if user is invited (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_user_invited_to_event(p_event_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_invitations 
    WHERE event_id = p_event_id AND user_id = p_user_id
  );
$$;

-- Step 3: Drop problematic event_invitations policy
DROP POLICY IF EXISTS "Event owners can manage invitations" ON event_invitations;

-- Step 4: Recreate event_invitations policy using helper function
CREATE POLICY "Event owners can manage invitations" ON event_invitations
FOR ALL
USING (
  auth.uid() = user_id 
  OR auth.uid() = public.get_event_owner(event_id)
);

-- Step 5: Drop the events visibility policy that causes recursion
DROP POLICY IF EXISTS "Users can view events based on visibility" ON events;

-- Step 6: Recreate events visibility policy using helper function
CREATE POLICY "Users can view events based on visibility" ON events
FOR SELECT
USING (
  auth.uid() = user_id 
  OR visibility = 'public'
  OR (
    visibility = 'connections' 
    AND EXISTS (
      SELECT 1 FROM public.user_connections
      WHERE status = 'accepted'
      AND (
        (user_id = auth.uid() AND connected_user_id = events.user_id)
        OR (connected_user_id = auth.uid() AND user_id = events.user_id)
      )
    )
  )
  OR (
    visibility = 'private' 
    AND public.is_user_invited_to_event(id, auth.uid())
  )
);