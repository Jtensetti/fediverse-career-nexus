-- Add federation columns to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_federated boolean DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS federated_activity_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS remote_sender_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS remote_recipient_url text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'local';

-- Create index for federated messages lookup
CREATE INDEX IF NOT EXISTS idx_messages_federated ON public.messages(is_federated) WHERE is_federated = true;

-- Create can_message_user RPC function
CREATE OR REPLACE FUNCTION public.can_message_user(sender_id uuid, recipient_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_connected boolean;
  recipient_is_remote boolean;
  recipient_actor_url text;
BEGIN
  -- First check if they are the same person
  IF sender_id = recipient_id THEN
    RETURN jsonb_build_object(
      'can_message', false,
      'is_federated', false,
      'reason', 'cannot_message_self'
    );
  END IF;

  -- Check if recipient is a remote federated user
  SELECT a.is_remote, a.remote_actor_url 
  INTO recipient_is_remote, recipient_actor_url
  FROM actors a WHERE a.user_id = recipient_id;
  
  IF recipient_is_remote = true THEN
    -- Federated users can always be messaged (delivered via ActivityPub)
    RETURN jsonb_build_object(
      'can_message', true,
      'is_federated', true,
      'remote_actor_url', recipient_actor_url,
      'reason', 'federated_user'
    );
  END IF;
  
  -- Check local user connection status
  SELECT are_users_connected(sender_id, recipient_id) INTO is_connected;
  
  IF is_connected THEN
    RETURN jsonb_build_object(
      'can_message', true,
      'is_federated', false,
      'reason', 'connected'
    );
  ELSE
    RETURN jsonb_build_object(
      'can_message', false,
      'is_federated', false,
      'reason', 'not_connected'
    );
  END IF;
END;
$$;

-- Create get_participant_info RPC function for resolving user info (local or federated)
CREATE OR REPLACE FUNCTION public.get_participant_info(participant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  profile_data record;
  actor_data record;
  cached_actor_data jsonb;
BEGIN
  -- First try to find as local user
  SELECT id, username, fullname, avatar_url
  INTO profile_data
  FROM public_profiles
  WHERE id = participant_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', profile_data.id,
      'username', profile_data.username,
      'fullname', profile_data.fullname,
      'avatar_url', profile_data.avatar_url,
      'is_federated', false,
      'home_instance', null,
      'found', true
    );
  END IF;
  
  -- Try to find as remote actor
  SELECT a.id, a.preferred_username, a.remote_actor_url, a.is_remote
  INTO actor_data
  FROM actors a
  WHERE a.user_id = participant_id AND a.is_remote = true;
  
  IF FOUND THEN
    -- Get cached profile data
    SELECT actor_data INTO cached_actor_data
    FROM remote_actors_cache
    WHERE actor_url = actor_data.remote_actor_url;
    
    RETURN jsonb_build_object(
      'id', participant_id,
      'username', COALESCE(cached_actor_data->>'preferredUsername', actor_data.preferred_username),
      'fullname', cached_actor_data->>'name',
      'avatar_url', cached_actor_data->'icon'->>'url',
      'is_federated', true,
      'home_instance', CASE 
        WHEN actor_data.remote_actor_url IS NOT NULL 
        THEN (regexp_match(actor_data.remote_actor_url, 'https?://([^/]+)'))[1]
        ELSE null
      END,
      'found', true
    );
  END IF;
  
  -- Not found
  RETURN jsonb_build_object(
    'found', false,
    'is_federated', false
  );
END;
$$;

-- Update messages RLS policy to allow federated messages
DROP POLICY IF EXISTS "Users can send messages to connections" ON public.messages;

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id 
  AND (
    -- Allow if users are connected
    are_users_connected(auth.uid(), recipient_id)
    -- OR if recipient is a remote federated user
    OR EXISTS (
      SELECT 1 FROM actors 
      WHERE user_id = recipient_id AND is_remote = true
    )
    -- OR if message is from federation (service role insert)
    OR is_federated = true
  )
);