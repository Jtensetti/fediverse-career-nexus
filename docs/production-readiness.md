# Deployment and launch requirements

Updated 22 September 2026. The service is not yet cleared for an unrestricted public launch. Passing local checks does not establish hosted-service behavior.

## Existing deployment

| Resource | Value |
| --- | --- |
| Repository | `Jtensetti/fediverse-career-nexus` |
| Cloud project name | `fediverse-career-newest` |
| Backend reference | `anknmcmqljejabxbeohv` |
| Federation domain | `nolto.social` |
| Operator | Jonatan Tensetti |

Use this existing backend. The historical projects referenced during setup are not production. `scripts/inspect-production.sql` is the read-only database preflight. Do not copy production records or secrets into test fixtures.

The five security/privacy migrations through `20260922065026` were applied and recorded on 22 September. The eight Storage buckets are private. Authenticated privacy maintenance runs every minute; the federation delivery worker runs separately. Scheduler secrets are read from Vault by `scripts/configure-cloud-jobs.sql`.

The authorized demo cleanup removed 50 seeded accounts, eight demo companies and 519 unreferenced files. One real account remains. The private pre-cleanup database backup exists but has not been restore-tested and does not include the deleted media. `scripts/cleanup-demo-data.mjs` is an explicit inventory/apply tool, not a recurring deletion job.

The moderation and AT Protocol identity migrations `20260922141011` and `20260922142915` were applied and recorded on 22 September. Their isolated regressions cover hidden content, author/moderator boundaries, approval, re-edits, notifications, media access, identity ownership, one-time OAuth state and expiring locks. Hosted OAuth sign-in still requires the activation checks in [moderation and AT Protocol](moderation-and-atproto.md).

## Release procedure

1. Confirm the exact backend reference and current schema. Make a restorable backup of the database, files and required secrets before a schema or storage change.
2. Rehearse new migrations in an isolated environment. The retained schema fixtures cover policy behavior; the full historical migration chain has not been verified from an empty database.
3. Apply new migrations and matching server handlers before publishing the dependent frontend. Record each migration. Git synchronization alone does not verify a backend deployment.
4. Run the README checks and isolated database regressions. Publish the resulting frontend and verify the actual deployment revision.
5. Check unauthenticated denial and real authenticated operations. Monitor scheduler failures, overdue deletion requests and federation delivery retries. Do not roll back a privacy migration by reopening access to hidden records.

## Required before public launch

- Complete signup, confirmation, recovery, MFA, onboarding, profile editing, messaging, company ownership, export and deletion journeys using separate test accounts on desktop and mobile.
- Verify DNS, TLS, redirects and discovery on `nolto.social`. The browser host redirect was removed; hosting rules still need confirmation. A direct backend response does not verify public-domain routing.
- Complete the [Mastodon interoperability checks](federation-launch-checklist.md). Public discovery has been checked directly against the backend, not end to end through another server.
- Restore the retained backup into an isolated backend with Auth and Storage. Establish backup expiry, key custody and a deletion manifest that prevents restored data from becoming visible again.
- Confirm gateway rate limits, private-network egress restrictions, alert delivery and the person responsible for incident response. Database request logs are not an abuse-prevention layer.
- Review the retained actor signing identity: earlier client-readable key paths were closed, but copied keys cannot be recalled. Rotate an exposed key pair through a controlled server procedure while preserving actor URLs.
- Verify actual providers, regions, processing/transfer agreements, backup/log retention and operator contact details against the privacy notice.
- Measure page loading and media costs on mobile and under realistic traffic. The production bundle still needs performance measurement.

## Scope limits

Mastodon linking is not full synchronization of histories, private messages, bookmarks, preferences or CV data. Local replies, boosts and quote reposts need further federation acceptance testing. Locked-account approval needs an owner-facing workflow before exposing that setting.

Inbox E2EE has no forward secrecy or key-rotation/recovery workflow. Losing the inbox phrase loses access to those messages. See [privacy and deletion](privacy-and-deletion.md) for the complete threat model and retention behavior.

Account exports fail above their configured size/row limits and require assisted handling; they are not a single cross-table point-in-time snapshot. Large federation fan-out, independent Auth/Storage failures and deletion backlog need hosted load and recovery tests.

## Federation routing

Keep `FEDERATION_DOMAIN=nolto.social` stable. `SITE_URL` may point to another web origin without changing account identity. When the UI is on a separate origin, `deploy/nolto-gateway.mjs` proxies discovery and ActivityPub paths before redirecting other requests. Set its `SUPABASE_ORIGIN` and `SITE_ORIGIN`; do not point the latter back to the gateway itself. Installing and verifying this gateway remains an operational task.
