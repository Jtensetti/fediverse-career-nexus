-- Fix saved_items constraint to include 'comment' as valid item_type
ALTER TABLE saved_items DROP CONSTRAINT saved_items_item_type_check;
ALTER TABLE saved_items ADD CONSTRAINT saved_items_item_type_check 
  CHECK (item_type = ANY (ARRAY['job', 'article', 'post', 'event', 'comment']));

-- Migrate legacy Like objects from ap_objects to reactions table
-- First, create a mapping for emojis to reaction keys
DO $$
DECLARE
  like_record RECORD;
  target_id_val TEXT;
  target_type_val TEXT;
  user_id_val UUID;
  reaction_key TEXT;
  emoji_val TEXT;
BEGIN
  -- Loop through all Like objects in ap_objects
  FOR like_record IN 
    SELECT 
      ao.id,
      ao.content,
      ao.attributed_to,
      a.user_id
    FROM ap_objects ao
    LEFT JOIN actors a ON ao.attributed_to = a.id
    WHERE ao.type = 'Like'
      AND a.user_id IS NOT NULL
  LOOP
    -- Extract target info from content
    target_id_val := like_record.content->'object'->>'id';
    
    -- Determine target type
    IF like_record.content->'object'->>'type' = 'reply' THEN
      target_type_val := 'reply';
    ELSE
      target_type_val := 'post';
    END IF;
    
    -- Get emoji and map to reaction key
    emoji_val := COALESCE(like_record.content->>'emoji', '❤️');
    
    CASE emoji_val
      WHEN '❤️' THEN reaction_key := 'love';
      WHEN '🎉' THEN reaction_key := 'celebrate';
      WHEN '👍' THEN reaction_key := 'support';
      WHEN '✌️' THEN reaction_key := 'support';
      WHEN '🤗' THEN reaction_key := 'empathy';
      WHEN '😮' THEN reaction_key := 'insightful';
      ELSE reaction_key := 'love';
    END CASE;
    
    -- Skip if target_id is null
    IF target_id_val IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Insert into reactions table if not exists
    INSERT INTO reactions (target_type, target_id, user_id, reaction)
    VALUES (target_type_val, target_id_val::uuid, like_record.user_id, reaction_key)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- Delete migrated Like objects from ap_objects (optional - keep for audit trail)
-- DELETE FROM ap_objects WHERE type = 'Like';