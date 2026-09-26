# Issue verification: #52 and #49 (2026-09-26)

Base: main ffde568 (workspace HEAD 8e66050 contains it). Not published, no functions deployed, no DNS/migration/data changes, no signups or emails sent.

## #52 Minute-precision event times — verified locally
- Start/end are labelled `<input type="time" step=60>` fields; edit keeps saved minutes (08:15, 10:07).
- Validation: empty → existing required errors; malformed/out-of-range (24:00, 10:60, 7:5, seconds) rejected; end ≤ start → existing `endAfterStart`; DST-skipped local time → new `nonexistentLocalTime` (all 8 locales, plus `invalidTime`). Nothing is normalized silently.
- End-after-start duration carry-over preserved at minute precision.
- Evidence: `scripts/events-ux.test.mjs` renders the real EventForm, EventCreate and EventEdit and asserts the captured submission ISO values (7 new tests, incl. Europe/Stockholm DST).
- Still needs production acceptance: manual create/edit in a real browser while signed in (native time picker UI differs per browser).

## #49 Confirmation link origin — fixed in code, not deployed
- Cause: `auth-signup` always built the link from `SITE_URL`, so a www signup got an apex link (and vice versa in split mode).
- Fix: `emailLinkOrigin(Origin)` in `_shared/federation-urls.ts`: uses the request origin only when it is SITE_URL, its www/apex twin, or listed in `EMAIL_LINK_ORIGINS`; otherwise SITE_URL. Self-hosted domains keep their own SITE_URL; nothing is hardcoded to nolto.social.
- Unchanged: token format/expiry, `auth-confirm-email`, password recovery (`window.location.origin`, governed by hosted Auth allow-list), Mastodon `/auth/callback`, Bluesky `/auth/atproto/callback`, social callback, MFA gates.
- Evidence: `supabase/tests/email-links.test.ts` (5 tests: www/apex both directions, self-hosted, forged/malformed origins, preview/localhost allow-list).
- Not verified: real email delivery or clicking a real link (not exercised); hosted Auth Site URL / redirect allow-list could not be read with available read-only tools. Live today: `www.nolto.social/*` 308 → apex with query preserved; apex `/confirm-email` serves the app; function CORS allows both origins.
- Requires: deploying `auth-signup`, then an isolated test signup on www and apex.
