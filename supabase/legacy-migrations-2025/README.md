# Archived 2025 migrations (not applied by the CLI)

These files predate the migration chain that starts at `20260104070751`. They are kept for
history only. The Supabase CLI does not read this directory.

- They are not in the ledger of the maintainer's hosted backend. That does **not** prove no
  self-hosted installation ever applied some of them.
- They cannot replay on an empty database: they call `is_admin`/`is_moderator` before those
  are defined, and five names (`<timestamp>-<uuid>.sql`) are skipped by the CLI.
- Existing installations: see "Existing installations" in `docs/fresh-install.md` before
  running any migration command.
