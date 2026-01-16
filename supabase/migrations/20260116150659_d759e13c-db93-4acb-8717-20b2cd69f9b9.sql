-- Drop existing function if it exists and recreate with improved fallback logic
DROP FUNCTION IF EXISTS public.get_participant_info(uuid);

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
  -- First try to find in profiles table directly
  SELECT id, username, fullname, avatar_url, auth_type, home_instance
  INTO profile_data
  FROM profiles
  WHERE id = participant_id;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', profile_data.id,
      'username', profile_data.username,
      'fullname', profile_data.fullname,
      'avatar_url', profile_data.avatar_url,
      'isFederated', COALESCE(profile_data.auth_type = 'federated', false),
      'homeInstance', profile_data.home_instance,
      'found', true
    );
  END IF;
  
  -- Try remote actor lookup for federated users
  SELECT a.id, a.preferred_username, a.remote_actor_url, a.is_remote, a.user_id
  INTO actor_data
  FROM actors a
  WHERE (a.user_id = participant_id OR a.id::text = participant_id::text) AND a.is_remote = true;
  
  IF FOUND THEN
    -- Try to get cached actor data for richer profile info
    SELECT actor_data INTO cached_actor_data
    FROM remote_actors_cache
    WHERE actor_url = actor_data.remote_actor_url;
    
    RETURN jsonb_build_object(
      'id', participant_id,
      'username', COALESCE(cached_actor_data->>'preferredUsername', actor_data.preferred_username),
      'fullname', cached_actor_data->>'name',
      'avatar_url', cached_actor_data->'icon'->>'url',
      'isFederated', true,
      'homeInstance', CASE 
        WHEN actor_data.remote_actor_url IS NOT NULL 
        THEN (regexp_match(actor_data.remote_actor_url, 'https?://([^/]+)'))[1]
        ELSE null
      END,
      'found', true
    );
  END IF;
  
  -- Not found anywhere
  RETURN jsonb_build_object(
    'found', false,
    'isFederated', false
  );
END;
$$;