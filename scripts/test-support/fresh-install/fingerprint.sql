-- Read-only schema fingerprint of the public schema (definitions only, no row data).
-- Used to compare a fresh-install replay with an existing installation.
WITH items(kind, object, def) AS (
  SELECT 'table', c.relname, c.relkind::text || ' rls=' || c.relrowsecurity || ' force=' || c.relforcerowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind IN ('r','p','v','m')
  UNION ALL
  SELECT 'column', table_name || '.' || column_name, data_type || '|' || udt_name || '|' || is_nullable || '|' || coalesce(column_default, '')
    FROM information_schema.columns WHERE table_schema = 'public'
  UNION ALL
  SELECT 'policy', tablename || '.' || policyname, permissive || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
    FROM pg_policies WHERE schemaname = 'public'
  UNION ALL
  SELECT 'function', p.oid::regprocedure::text, md5(pg_get_functiondef(p.oid)) || ' secdef=' || p.prosecdef || ' acl=' || coalesce(array_to_string(p.proacl, ','), 'default')
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prokind IN ('f','p')
  UNION ALL
  SELECT 'trigger', c.relname || '.' || t.tgname, pg_get_triggerdef(t.oid)
    FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal AND (n.nspname = 'public' OR (n.nspname = 'auth' AND c.relname = 'users'))
  UNION ALL
  SELECT 'index', indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'
  UNION ALL
  SELECT 'grant', table_name || '.' || grantee, string_agg(privilege_type, ',' ORDER BY privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'service_role') GROUP BY table_name, grantee
  UNION ALL
  SELECT 'type', t.typname, coalesce((SELECT string_agg(enumlabel, ',' ORDER BY enumsortorder) FROM pg_enum e WHERE e.enumtypid = t.oid), t.typtype::text)
    FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype IN ('e','d')
  UNION ALL
  SELECT 'storage_policy', policyname, cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '') || '|' || coalesce(with_check, '')
    FROM pg_policies WHERE schemaname = 'storage'
  UNION ALL
  SELECT 'cron', jobname, schedule FROM cron.job
)
SELECT kind, object, md5(def) AS hash FROM items ORDER BY kind, object
