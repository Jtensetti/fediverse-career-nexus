# Fresh install database (issue #48)

## What was wrong
- `supabase/migrations` contained 15 pre-2026 files (`20250522_…` to `20250617_…`). They were never recorded in the hosted migration ledger (which starts at `20260104070751`), they reference `is_admin`/`is_moderator` before `20260104070753` defines them, and five had names the CLI skips (`<ts>-<uuid>.sql`). A fresh `supabase start` therefore failed at the first one.
- One migration that is applied on the hosted backend (`20260201085158`, article-covers/article-images buckets and owner-folder policies) was missing from the repository, so a fresh install would have lacked those buckets.

## Repair
- The 15 legacy files moved to `supabase/legacy-migrations-2025/` (kept for history, never applied). No applied migration was renamed or renumbered.
- `20260201085158` restored verbatim from the hosted ledger. It is already applied on hosted, so it is a no-op there.
- Hosted `20260213075004` (an arbitrary-SQL `exec_sql` helper, later dropped by `20260331114811`) was deliberately not restored; final schema is identical without it.

## Verification
`npm run test:fresh-install` (runs in CI job `fresh-install`) creates a throwaway database, applies `scripts/test-support/fresh-install/platform-stub.sql`, replays every migration in CLI order with one transaction each, then runs `assertions.sql`: RLS on every public table, private buckets, client roles cannot provision actors or self-assign admin, an Auth signup creates profile/role/settings, `is_admin` follows `user_roles`, reserved usernames rejected, server-side actor provisioning.

Structure fingerprint (`fingerprint.sql`, schema metadata only) of the fresh database matched the hosted backend for tables, columns, RLS, policies, storage policies, grants, indexes, types, functions and triggers, except the objects of the not-yet-applied `20260925180809` mobile-push migration.

## Limitations
The stub is not Supabase: auth/storage are minimal tables, `pg_cron`/`pg_net` are inert stand-ins (record schedules, no network). Real Auth/Storage/Realtime services are not exercised. A final `npx supabase start` on a Docker runner is still the acceptance step. The runner refuses non-`nolto_fresh_*` databases and hosted hosts.
