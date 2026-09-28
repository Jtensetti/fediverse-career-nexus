
-- Ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Set stable search_path for key functions (check if function exists first)
DO $$
BEGIN
    -- Update search_path for each function if it exists
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_current_server_key' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_current_server_key() SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_federation_queue_stats' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_federation_queue_stats() SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_actor_follower_count' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.update_actor_follower_count() SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_outgoing_follows_updated_at' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.update_outgoing_follows_updated_at() SET search_path = 'public, pg_temp';
    END IF;
    
    -- Fix: actor_id_to_partition_key takes uuid, not text
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'actor_id_to_partition_key' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.actor_id_to_partition_key(uuid) SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_federation_queue_partition_key' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.set_federation_queue_partition_key() SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'migrate_federation_queue_data' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.migrate_federation_queue_data() SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_follower_batches' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.create_follower_batches(uuid, jsonb, integer) SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_follower_batch_stats' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.get_follower_batch_stats() SET search_path = 'public, pg_temp';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_expired_actor_cache' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.cleanup_expired_actor_cache() SET search_path = 'public, pg_temp';
    END IF;
END $$;
