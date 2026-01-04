-- Phase 2: Event Visibility Controls

-- Add visibility column to events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'connections', 'private'));

-- Create event invitations table for private events
CREATE TABLE IF NOT EXISTS public.event_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on event_invitations
ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_invitations
CREATE POLICY "Users can view their own invitations"
ON public.event_invitations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Event owners can manage invitations"
ON public.event_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = event_invitations.event_id 
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Invited users can update their invitation status"
ON public.event_invitations
FOR UPDATE
USING (auth.uid() = user_id);

-- Update events RLS policy to handle visibility
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;

CREATE POLICY "Users can view events based on visibility"
ON public.events
FOR SELECT
USING (
  -- Owner can always see their events
  auth.uid() = user_id
  -- Public events visible to all
  OR visibility = 'public'
  -- Connections-only events visible to connections
  OR (visibility = 'connections' AND public.are_users_connected(auth.uid(), user_id))
  -- Private events visible to invited users
  OR (visibility = 'private' AND EXISTS (
    SELECT 1 FROM public.event_invitations 
    WHERE event_invitations.event_id = events.id 
    AND event_invitations.user_id = auth.uid()
  ))
);