# Engineering rules

- Account-email links use `emailLinkOrigin()`/`confirmationLink()`: SITE_URL by default; a request Origin only if it exactly equals SITE_URL or an exact origin in EMAIL_LINK_ORIGINS (no www/apex/suffix inference) — a hostname sibling may be delegated elsewhere.
- Fresh installs replay only `supabase/migrations` (the hosted chain from 20260104070751); pre-2026 files live in `supabase/legacy-migrations-2025/` and `npm run test:fresh-install` must pass — the 2025 files were never in the hosted ledger and cannot replay.
- Event start/end times are free `HH:mm` inputs validated by `TIME_PATTERN`/`isValidLocalDateTime` — minute precision without silently shifting malformed or DST-skipped times.
