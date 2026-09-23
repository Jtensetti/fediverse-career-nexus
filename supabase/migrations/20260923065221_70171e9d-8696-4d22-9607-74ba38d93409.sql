-- Managed deployment tracking marker (23 September 2026).
-- Production applied 20260922184945_mastodon_client_access.sql once under
-- this platform-generated version and also recorded the canonical version.
-- Fresh databases execute the schema change only in the earlier canonical file.
-- Keep this marker to reconcile deployed migration history without replaying DDL.
SELECT 1;
