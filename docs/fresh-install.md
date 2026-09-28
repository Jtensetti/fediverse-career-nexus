# Fresh-install database verification (issue #48)

Updated 26 September 2026. Verified code: `d0b820c5c23666d8da523b49c33393e2bab50809`. The reported fresh-install failure is fixed and the real Supabase acceptance test passes. This is not a blanket production-readiness or existing-instance upgrade certification.

## What was wrong

`supabase/migrations` contained 15 pre-2026 files, from `20250522_…` to `20250617_…`. The first called `is_admin`/`is_moderator` before the 2026 foundational migration defined them; five filenames used a separator that the CLI skips. These files are absent from the inspected hosted ledger, which starts at `20260104070751`. That observation does not prove that other self-hosted installations never applied them.

The article-cover/article-image storage migration `20260201085158`, already present in the inspected hosted ledger, was missing from the repository.

## Repair and scope

The 15 legacy files are retained in `supabase/legacy-migrations-2025/` outside the active CLI migration directory. The missing `20260201085158` storage migration was restored from the hosted ledger. Existing applied migrations were not renumbered, and no permissive role-check stub was added.

The historical arbitrary-SQL `exec_sql` helper migration `20260213075004`, subsequently dropped by `20260331114811`, was deliberately not restored. Its omission is known ledger drift, not an instruction to repair a live ledger automatically.

This repair covers **new, empty databases using the 2026 migration chain**. No hosted migration or data change was performed.

## Verified with real Supabase

[Real Supabase acceptance run 36245119540](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119540) completed successfully on 26 September at 13:28 UTC. The workflow `.github/workflows/supabase-fresh-install.yml`:

1. Creates an unlinked disposable project from the repository config, migrations and function sources, without production credentials, environment files or seed data.
2. Blocks outbound container connections before startup and verifies that its firewall rejects a test connection. This prevents historical cron/net jobs from contacting production endpoints.
3. Runs `supabase@2.118.0 start` with normal health checks and real Auth, Storage, Realtime, PostgreSQL, pg_cron and pg_net services. **All 136 project migration versions are applied and recorded**, with an exact comparison against the directory contents.
4. Runs transactional RLS, private-storage, role-escalation, function-permission, reserved-name, profile/settings/role and actor-provisioning assertions against the real database.
5. Creates a disposable account through real Auth, signs in with a password, and reads the owner's profile through PostgREST using the user token.
6. Runs the actual signup and confirmation handlers against real local Auth/SQL, following generated canonical-apex and explicitly permitted-www email links through token consumption and successful login. Only outbound email delivery is replaced by an in-memory sink.
7. Deletes its fixture accounts and disposable stack. No production account, email, schema or DNS change occurs.

The Docker workflow can be rerun manually and also runs for its relevant source changes. Its successful run establishes fresh installation and the stated smoke tests; it does not test inbox delivery, native Android clients, external federation or upgrades from an old installation.

## Fast structural regression

The separate `fresh-install` job in [main CI run 292](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119547) also passes. `npm run test:fresh-install` creates a throwaway PostgreSQL17 database, applies `scripts/test-support/fresh-install/platform-stub.sql`, replays every migration in order with one transaction each, and runs `assertions.sql`.

That faster test deliberately uses minimal Auth/Storage tables and inert pg_cron/pg_net stand-ins. It does **not** replace the real-platform acceptance test above. The schema-metadata fingerprint query is `scripts/test-support/fresh-install/fingerprint.sql`; a prior comparison found the expected difference for the not-yet-applied hosted mobile-push migration.

To run the fast test, use only a disposable local PostgreSQL server:

```sh
NOLTO_FRESH_INSTALL_TEST=1 PGHOST=127.0.0.1 PGUSER=postgres PGPASSWORD=… npm run test:fresh-install
```

`PGHOST` must be literal `127.0.0.1`, `::1` or an absolute local socket directory. The runner requires explicit opt-in, creates only `nolto_fresh_*` test databases, strips inherited libpq destination overrides such as `PGHOSTADDR`, `PGSERVICE`, `PGOPTIONS`, `PGDATABASE` and `PGPASSFILE`, and sets a five-second connection timeout. It creates cluster-wide roles, so do not point it at a local server containing valuable databases.

For the real Supabase database named `postgres`, the workflow sets the test-only marker `nolto.fresh_install_guard=isolated-ci` through `docker exec` into the known disposable container. Without that marker or a `nolto_fresh_*` database name, `assertions.sql` refuses to run.

## Existing installations require separate review

**Do not blindly run `supabase db push`, `db reset` or `migration repair` against an existing database.** Take a backup, compare its actual migration ledger and schema, and reconcile drift before an upgrade.

Known differences in the inspected hosted ledger include the already-applied restored storage migration, the intentionally omitted historical `exec_sql` migration, some one-second timestamp differences, and the repository's `20260925180809` mobile-push migration not yet applied there. Other installations may have some, all or none of the archived 2025 migrations. A successful empty-database replay does not resolve those histories automatically.
