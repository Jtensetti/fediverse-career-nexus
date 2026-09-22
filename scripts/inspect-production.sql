-- Read-only preflight for the existing Nolto database, including the hosted backend.
-- Run through the project's authenticated SQL editor or database connector.
-- Returns aggregates and schema metadata only; never returns keys, tokens or user details.
-- These checks do not replace a restorable backup or a staging migration rehearsal.
WITH demo_users AS (
  SELECT id FROM auth.users
  WHERE raw_user_meta_data @> '{"seeded":true}'::jsonb
    AND lower(email) LIKE '%@demo.nolto.local'
), duplicate_usernames AS (
  SELECT lower(username) FROM public.profiles
  WHERE username IS NOT NULL GROUP BY lower(username) HAVING count(*) > 1
), duplicate_actors AS (
  SELECT user_id FROM public.actors
  WHERE user_id IS NOT NULL AND is_remote = false
  GROUP BY user_id HAVING count(*) > 1
), required_relations(name) AS (
  VALUES ('public.actors'), ('public.profiles'), ('public.public_actors'),
    ('public.server_keys'), ('public.user_roles'), ('public.user_settings'),
    ('public.email_verification_tokens'), ('public.ap_objects'),
    ('public.outgoing_follows'), ('public.actor_followers'),
    ('public.federation_queue_partitioned')
), protected_routines AS (
  SELECT p.oid, p.oid::regprocedure::text AS signature
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN (
    'ensure_actor_keys', 'get_actor_private_key', 'get_actor_private_key_service',
    'get_server_keys', 'get_server_key', 'get_current_server_key',
    'claim_federation_items', 'cleanup_federation_signature_cache',
    'create_follower_batches', 'create_follow'
  )
), queue_counts AS (
  SELECT status, count(*) AS jobs
  FROM public.federation_queue_partitioned GROUP BY status
)
SELECT jsonb_build_object(
  'accounts', jsonb_build_object(
    'total', (SELECT count(*) FROM auth.users),
    'marked_demo', (SELECT count(*) FROM demo_users),
    'preserve', (SELECT count(*) FROM auth.users u
      WHERE NOT EXISTS (SELECT 1 FROM demo_users d WHERE d.id = u.id)),
    'demo_actors', (SELECT count(*) FROM public.actors a
      JOIN demo_users d ON d.id = a.user_id),
    'companies_total', (SELECT count(*) FROM public.companies)
  ),
  'identity_preconditions', jsonb_build_object(
    'duplicate_username_groups', (SELECT count(*) FROM duplicate_usernames),
    'duplicate_local_actor_groups', (SELECT count(*) FROM duplicate_actors),
    'local_actor_username_mismatches', (SELECT count(*) FROM public.actors a
      JOIN public.profiles p ON p.id = a.user_id
      WHERE a.is_remote = false AND a.preferred_username IS DISTINCT FROM p.username),
    'local_actors_with_incomplete_key_pairs', (SELECT count(*) FROM public.actors
      WHERE is_remote = false AND ((private_key IS NULL) <> (public_key IS NULL)))
  ),
  'schema', jsonb_build_object(
    'missing_required_relations', (SELECT coalesce(jsonb_agg(name ORDER BY name), '[]'::jsonb)
      FROM required_relations WHERE to_regclass(name) IS NULL),
    'partition_function_present', to_regprocedure('public.actor_id_to_partition_key(uuid)') IS NOT NULL,
    'delivery_ledger_present', to_regclass('public.federation_deliveries') IS NOT NULL,
    'oauth_states_present', to_regclass('public.federated_oauth_states') IS NOT NULL,
    'oauth_identity_bindings_present', to_regclass('public.federated_identities') IS NOT NULL,
    'session_assurance_function_present', to_regprocedure('public.current_session_is_verified()') IS NOT NULL,
    'retired_usernames_present', to_regclass('public.retired_usernames') IS NOT NULL
  ),
  'key_access', jsonb_build_object(
    'anon_has_column_privilege', has_column_privilege('anon', 'public.actors', 'private_key', 'SELECT'),
    'authenticated_has_column_privilege', has_column_privilege('authenticated', 'public.actors', 'private_key', 'SELECT'),
    'client_executable_sensitive_routines', (SELECT coalesce(jsonb_agg(signature ORDER BY signature), '[]'::jsonb)
      FROM protected_routines WHERE has_function_privilege('anon', oid, 'EXECUTE')
        OR has_function_privilege('authenticated', oid, 'EXECUTE'))
  ),
  'account_preconditions', jsonb_build_object(
    'company_roles_without_users', (SELECT count(*) FROM public.company_roles r
      WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id=r.user_id)),
    'messages_total', (SELECT count(*) FROM public.messages),
    'legacy_plaintext_messages', (SELECT count(*) FROM public.messages WHERE is_encrypted IS DISTINCT FROM true),
    'verified_session_policies', (SELECT count(*) FROM pg_policies
      WHERE policyname='Verified live session' AND schemaname IN ('public','storage'))
  ),
  'federation_queue', (SELECT coalesce(jsonb_object_agg(status, jobs), '{}'::jsonb) FROM queue_counts)
) AS preflight;
