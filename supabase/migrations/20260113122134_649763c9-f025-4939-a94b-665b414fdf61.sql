-- Create function to notify when a post receives a reaction
CREATE OR REPLACE FUNCTION public.notify_post_reaction()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  target_post_id text;
  post_author_actor_id uuid;
  post_author_user_id uuid;
  reacting_user_id uuid;
  is_reply_reaction boolean;
BEGIN
  -- Only process Like activities
  IF NEW.type != 'Like' THEN
    RETURN NEW;
  END IF;

  -- Check if this is a reply reaction (skip if so)
  is_reply_reaction := (NEW.content->>'object'->>'type') = 'reply';
  IF is_reply_reaction THEN
    RETURN NEW;
  END IF;

  -- Extract the target post ID from the Like activity
  target_post_id := NEW.content->'object'->>'id';
  IF target_post_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the post and its author
  SELECT ap.attributed_to INTO post_author_actor_id
  FROM ap_objects ap
  WHERE ap.id = target_post_id::uuid OR ap.id::text = target_post_id;

  IF post_author_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user_id of the post author
  SELECT a.user_id INTO post_author_user_id
  FROM actors a
  WHERE a.id = post_author_actor_id;

  IF post_author_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user_id of the person reacting
  SELECT a.user_id INTO reacting_user_id
  FROM actors a
  WHERE a.id = NEW.attributed_to;

  -- Don't notify if user is liking their own post
  IF reacting_user_id = post_author_user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the post author
  INSERT INTO notifications (
    type,
    recipient_id,
    actor_id,
    object_id,
    object_type,
    content,
    read
  ) VALUES (
    'like',
    post_author_user_id,
    reacting_user_id,
    target_post_id,
    'post',
    'liked your post',
    false
  );

  RETURN NEW;
END;
$$;

-- Create trigger for post reactions
DROP TRIGGER IF EXISTS on_post_reaction ON ap_objects;
CREATE TRIGGER on_post_reaction
  AFTER INSERT ON ap_objects
  FOR EACH ROW
  WHEN (NEW.type = 'Like')
  EXECUTE FUNCTION notify_post_reaction();

-- Create function to notify when someone replies to a post
CREATE OR REPLACE FUNCTION public.notify_post_reply()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  post_author_actor_id uuid;
  post_author_user_id uuid;
BEGIN
  -- Find the post author
  SELECT ap.attributed_to INTO post_author_actor_id
  FROM ap_objects ap
  WHERE ap.id = NEW.post_id::uuid;

  IF post_author_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get the user_id of the post author
  SELECT a.user_id INTO post_author_user_id
  FROM actors a
  WHERE a.id = post_author_actor_id;

  IF post_author_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't notify if user is replying to their own post
  IF NEW.user_id = post_author_user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification for the post author
  INSERT INTO notifications (
    type,
    recipient_id,
    actor_id,
    object_id,
    object_type,
    content,
    read
  ) VALUES (
    'reply',
    post_author_user_id,
    NEW.user_id,
    NEW.post_id,
    'post',
    'replied to your post',
    false
  );

  RETURN NEW;
END;
$$;

-- Create trigger for post replies
DROP TRIGGER IF EXISTS on_post_reply ON post_replies;
CREATE TRIGGER on_post_reply
  AFTER INSERT ON post_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_reply();