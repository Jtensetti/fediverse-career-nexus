# Issue repair and verification — 26 September 2026

Verified code commit: `d0b820c5c23666d8da523b49c33393e2bab50809` on main. This report is a documentation-only follow-up. The unrelated language-review PR #85 was not merged or modified.

## Issue disposition

| Issue | Result | Evidence and boundary |
| --- | --- | --- |
| #48 — fresh installation fails because is_admin is missing | Fixed; closed completed | The 15 incompatible pre-2026 migrations are retained outside the active chain; the missing article-image storage migration is restored. Real Supabase starts, applies and records all 136 migrations, and passes security/provisioning and Auth/PostgREST checks. Existing-instance upgrades need a separate ledger/schema review. |
| #49 — wrong origin in confirmation email | Fixed in source; closed completed | Exact-origin allowlist and canonical default; actual signup/confirmation handlers pass against real local Auth/SQL, including generated email-link tokens and login. Only email delivery is substituted. Not deployed or tested through a real inbox. |
| #52 — event times limited to half-hour intervals | Fixed; closed completed | Minute-precision inputs, create/edit preservation, end-after-start adjustment and strict/DST-aware validation pass actual React-component tests. No claim of manual coverage of every browser's native time picker. |
| #51 — Moshidon/Mastodon-client compatibility | Remains open | Three source-derived Moshidon callback/request variants pass real HTTP handlers with isolated backend fixtures. Actual Android sign-in, consent and browser-to-app return are not yet verified. Full Mastodon API support is not claimed. |
| #50 — www/apex redirects | Previously closed; freshly verified live | Eight read-only production probes pass, including canonical 308, HTTP/HTTPS routing and confirmation path/query preservation. |
| #40 — overly broad federated-login OAuth scope | Previously closed; unchanged | The earlier source review established read:accounts instead of broad read; this pass did not reopen or alter the scope. |

## Executed checks

| Check | Result | Run |
| --- | --- | --- |
| Main validation, fast fresh install, container and mobile | All four jobs successful | [CI run 292](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119547) |
| Node tests | 125 passed; 0 failed | Main validation job |
| Deno tests | 72 passed; 0 failed | Main validation job |
| Both TypeScript configurations, source checks, all Edge checks, production build | Passed | Main validation job |
| Isolated identity, actor provisioning, account boundaries and privacy SQL regressions | Passed | Main validation job |
| Real Supabase CLI 2.118.0 startup and migration ledger | All 136 project migrations applied and recorded; normal health checks passed | [Real acceptance run 36245119540](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36245119540), completed 13:28 UTC |
| Real database permissions/provisioning; real Auth login and own-profile access | Passed | Real acceptance run |
| Actual signup → generated email link → real token confirmation → real password login | Both canonical-apex and explicitly permitted-www cases passed; replay idempotent | Real acceptance run |
| Live read-only routing and Mastodon/OAuth discovery/access probes | 8/8 passed | [Production probes 36244002667](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36244002667), 13:05 UTC |

The existing build warning about a JavaScript chunk exceeding 500 kB remains; the build succeeds. The npm audit in the recorded main validation run reported zero findings, which is a dated dependency result, not a general security guarantee.

## Moshidon verification boundary

`supabase/tests/moshidon-contract.test.ts` follows the actual upstream CreateOAuthApp, GetOauthToken, AccountSessionManager and OAuthActivity request shapes, with source identifiers recorded in the test. It exercises release/debug/nightly callbacks, read/write/follow/push registration scopes, the client's authorization and JSON token exchange, identity, home, custom emojis, and rejection after revocation. It also checks that private identifiers and stored credential hashes are not exposed. Existing consent, session, MFA and exact-redirect checks were not relaxed.

Those tests do not run an Android APK or establish native callback dispatch. The remaining acceptance is: select nolto.social in Moshidon, sign in, explicitly approve access, return to the app, verify account/home, then revoke access. Record the app version and failing step. The supported experimental subset and absent capabilities remain documented in [mastodon-client-access.md](mastodon-client-access.md); this task does not add DMs, streaming, media uploads or Mastodon push support.

## Production and upgrade boundary

All source and test changes are committed to main. No frontend publication, backend function deployment, hosted migration, DNS change, production account creation or real email delivery was performed. Successful repository tests do not establish deployment of the same source revision.

Real-platform test data existed only in disposable CI databases. Firewall rules blocked outbound container connections before Supabase startup, including historical cron jobs, and cleanup removed the stack. Only the email transport was replaced for the real signup/confirmation integration.

Before an existing-instance upgrade, take a backup and compare its actual ledger/schema. Do not blindly run db push, db reset or migration repair: 2025 histories and known hosted version drift are not resolved by an empty-database test. See [fresh-install.md](fresh-install.md). Detailed event/email evidence is in [issue-verification-52-49.md](issue-verification-52-49.md).
