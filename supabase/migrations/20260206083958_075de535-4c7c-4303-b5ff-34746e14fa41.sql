-- Phase 1A: Add retry columns for exponential backoff
ALTER TABLE federation_queue_partitioned
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 10;

-- Phase 1A: Atomic claim function with SKIP LOCKED to prevent race conditions
CREATE OR REPLACE FUNCTION claim_federation_items(
  p_partition INTEGER,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF federation_queue_partitioned
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE federation_queue_partitioned
  SET 
    status = 'processing',
    processed_at = now()
  WHERE id IN (
    SELECT id FROM federation_queue_partitioned
    WHERE partition_key = p_partition
      AND status IN ('pending', 'retry')
      AND (next_retry_at IS NULL OR next_retry_at <= now())
      AND (attempts IS NULL OR attempts < max_attempts)
      AND (scheduled_for IS NULL OR scheduled_for <= now())
    ORDER BY priority DESC NULLS LAST, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;

-- Phase 4: Tombstone trigger for proper delete propagation
CREATE OR REPLACE FUNCTION queue_delete_for_federation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.attributed_to IS NOT NULL THEN
    -- Create tombstone record (update existing row to Tombstone)
    UPDATE ap_objects SET
      type = 'Tombstone',
      content = jsonb_build_object(
        'type', 'Tombstone',
        'formerType', OLD.type,
        'deleted', now()
      ),
      updated_at = now()
    WHERE id = OLD.id;
    
    -- Queue delete activity for federation
    INSERT INTO federation_queue_partitioned (
      actor_id, 
      activity, 
      status, 
      partition_key, 
      priority
    ) VALUES (
      OLD.attributed_to,
      jsonb_build_object(
        '@context', 'https://www.w3.org/ns/activitystreams',
        'type', 'Delete',
        'actor', OLD.content->>'attributedTo',
        'object', jsonb_build_object(
          'type', 'Tombstone',
          'id', OLD.content->>'id',
          'formerType', OLD.type
        ),
        'to', jsonb_build_array('https://www.w3.org/ns/activitystreams#Public')
      ),
      'pending',
      actor_id_to_partition_key(OLD.attributed_to),
      8  -- High priority for deletes
    );
    
    -- Return NULL to cancel the actual DELETE (we converted to Tombstone instead)
    RETURN NULL;
  END IF;
  RETURN OLD;
END;
$$;

-- Create the trigger (drop first if exists)
DROP TRIGGER IF EXISTS trigger_federate_deleted_post ON ap_objects;
CREATE TRIGGER trigger_federate_deleted_post
  BEFORE DELETE ON ap_objects
  FOR EACH ROW
  WHEN (OLD.type IN ('Note', 'Article'))
  EXECUTE FUNCTION queue_delete_for_federation();

-- Phase 1B: Thin trigger for post fanout (backup path)
CREATE OR REPLACE FUNCTION queue_post_for_federation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for Note types that haven't been queued yet
  IF NEW.type = 'Note' AND NEW.attributed_to IS NOT NULL THEN
    -- Check if already queued (avoid duplicates from outbox)
    IF NOT EXISTS (
      SELECT 1 FROM federation_queue_partitioned 
      WHERE activity->>'object_id' = NEW.id::text
        AND created_at > now() - interval '1 minute'
    ) THEN
      INSERT INTO federation_queue_partitioned (
        actor_id, 
        activity,
        status, 
        partition_key,
        priority
      ) VALUES (
        NEW.attributed_to,
        jsonb_build_object(
          'type', 'Create',
          'object_id', NEW.id::text,
          'needs_enrichment', true
        ),
        'pending',
        actor_id_to_partition_key(NEW.attributed_to),
        5
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Note: Not creating trigger for queue_post_for_federation as outbox already handles this