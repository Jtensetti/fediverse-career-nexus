# Issue verification: #52 and #49

Updated 26 September 2026. Verified code: `d0b820c5c23666d8da523b49c33393e2bab50809`. Both issues are closed as fixed in the repository. Source changes were not published or deployed by this task. Test accounts existed only in disposable local/CI databases; no production accounts or real emails were created.

See [the full issue-verification summary](issue-verification-2026-09-26.md) for all issues and test runs.

## #52 — minute-precision event times

Start and end use labelled `<input type="time" step="60">` fields instead of half-hour menus. Create and edit preserve arbitrary minutes such as 08:15 and 10:07. End-after-start duration adjustment remains intact.

Validation rejects empty, malformed and out-of-range values, seconds, end times not later than the start, and local times skipped by a DST transition. Invalid times are not silently normalized. The new error messages exist in all eight locales.

Seven added tests in `scripts/events-ux.test.mjs` render the real EventForm/EventCreate/EventEdit components and assert captured ISO submission values, minute preservation, duration adjustment, validation and Europe/Stockholm DST behavior. These pass in [main CI run 292](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119547).

This verifies code and automated component behavior, not a manual signed-in create/edit test on every browser. Native time-picker presentation can vary.

## #49 — confirmation-link origin and token flow

The report described a www signup receiving an apex link that failed. The previous use of SITE_URL is consistent with that symptom, but current tests do not prove the precise historical cause.

`emailLinkOrigin()` uses SITE_URL by default. A different request Origin must exactly match an explicitly configured `EMAIL_LINK_ORIGINS` entry. There is no automatic trust of a www/apex sibling: a sibling could be delegated elsewhere. Credentials, paths, queries, wildcard/suffix matching and unlisted port variants cannot expand trust. Self-hosted domains remain supported; preview/localhost alternatives require exact explicit entries.

`confirmationLink()` builds `<origin>/confirm-email?token=…`; signup and resend both use it. The real ConfirmEmail page sends the query token unchanged to the confirmation handler. A consumed confirmation can be repeated successfully without returning a session or re-confirming the account.

With SITE_URL set to the currently canonical apex and no alternate-origin allowlist, www requests receive apex links. The production www redirect now preserves the path and query. Adding a www allowlist entry is an operator choice, not a required change for current canonical routing.

### Verification layers

- `supabase/tests/email-links.test.ts`: exact-origin trust, forged/unlisted origins, self-hosted and explicit preview/localhost cases, URL/token construction.
- `supabase/tests/email-confirmation-flow.test.ts`: actual signup/confirmation handlers with isolated database and email fixtures; signup, resend neutrality, token success/replay, malformed/unknown/expired tokens, validation, rate limiting, provider failure and error/logging boundaries.
- `scripts/confirm-email-page.test.mjs`: actual React confirmation page, exact token consumption, missing-token, expired and failure states.
- `scripts/federation-gateway.test.mjs`: confirmation path and query preserved through the split-domain GET redirect. Isolated identity SQL tests separately exercise real token issuance, cooldown and privileges.
- `scripts/test-support/run-email-confirmation.ts`: **actual handlers with real disposable Supabase Auth and PostgreSQL/PostgREST**, not a mocked database. Only outbound email delivery is an in-memory sink. It captures the generated email text, extracts and follows the token, checks the real account and token row before/after confirmation, checks idempotent replay, and completes real password login. Canonical-apex and explicitly allowlisted-www cases both pass; unknown-account resend remains generic and sends no message.

The real integration passed in [Supabase acceptance run 36245119540](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119540). All four jobs of [main CI run 292](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119547) pass, including 125 Node tests and 72 Deno tests.

[Read-only production probes](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36244002667) also passed 8/8, including www/apex canonical routing and preservation of a nonsecret test confirmation query. Those GET probes do not execute the confirmation page or consume a real token.

### Deployment boundary

No frontend publication, function deployment, production migration, Auth setting or DNS change was performed. Deploy the matching frontend and `auth-signup`/`auth-confirm-email` functions with shared dependencies before claiming the new source is running in production. Real email-provider delivery, inbox arrival and clicking a delivered production email were not tested. The tests prove the stated source behavior, not those external delivery steps.
