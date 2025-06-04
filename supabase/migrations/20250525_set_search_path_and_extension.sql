-- Ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;
-- Move pg_net extension out of public schema
ALTER EXTENSION IF EXISTS pg_net SET SCHEMA extensions;

-- Set stable search_path for key functions
ALTER FUNCTION IF EXISTS public.get_current_server_key() SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.get_federation_queue_stats() SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.update_actor_follower_count() SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.update_outgoing_follows_updated_at() SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.actor_id_to_partition_key(text) SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.set_federation_queue_partition_key(integer) SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.migrate_federation_queue_data() SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.create_follower_batches(uuid, jsonb, integer) SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.get_follower_batch_stats() SET search_path = 'public, pg_temp';
ALTER FUNCTION IF EXISTS public.cleanup_expired_actor_cache() SET search_path = 'public, pg_temp';
