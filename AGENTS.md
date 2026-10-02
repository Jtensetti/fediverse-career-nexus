# Engineering rules

- Account-email links use `emailLinkOrigin()`/`confirmationLink()`: SITE_URL by default; a request Origin only if it exactly equals SITE_URL or an exact origin in EMAIL_LINK_ORIGINS (no www/apex/suffix inference) — a hostname sibling may be delegated elsewhere.
- Fresh installs replay only `supabase/migrations` (the hosted chain from 20260104070751); pre-2026 files live in `supabase/legacy-migrations-2025/` and `npm run test:fresh-install` must pass — the 2025 files were never in the hosted ledger and cannot replay.
- Event start/end times are free `HH:mm` inputs validated by `TIME_PATTERN`/`isValidLocalDateTime` — minute precision without silently shifting malformed or DST-skipped times.
- Honeypot IP blocks run in the Cloudflare gateway via the `ip-guard` function (GATEWAY_GUARD_SECRET, salted hashes only) and fail open; federation/API paths always bypass them so shared IPs never break delivery.

## Email test safety

Never run email-producing Auth tests (signup, reset, resend or magic links) against a hosted backend with fabricated recipients. Use local Supabase with Mailpit or mocked delivery. A localhost frontend does not isolate a hosted Auth backend. Use the digest worker's authorized `{ "dryRun": true }` mode for non-sending checks, and never enable mail schedules as part of a test.
