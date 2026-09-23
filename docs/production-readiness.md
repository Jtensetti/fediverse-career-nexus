# Deployment and launch requirements

Updated 23 September 2026. The experimental Mastodon client subset is available to all Nolto accounts, with the tested scope recorded below. Broader service launch requirements remain open; this is not a claim of complete Mastodon interoperability.

## Existing deployment

| Resource | Value |
| --- | --- |
| Repository | `Jtensetti/fediverse-career-nexus` |
| Cloud project name | `fediverse-career-newest` |
| Backend reference | `anknmcmqljejabxbeohv` |
| Federation domain | `nolto.social` |
| Cloudflare Worker | `nolto-federation` |
| Operator | Jonatan Tensetti |

Use this existing backend. The historical projects referenced during setup are not production. `scripts/inspect-production.sql` is the read-only database preflight. Do not copy production records or secrets into test fixtures.

The five security/privacy migrations through `20260922065026` were applied and recorded on 22 September. The eight Storage buckets are private. Authenticated privacy maintenance runs every minute; the federation delivery worker runs separately. Scheduler secrets are read from Vault by `scripts/configure-cloud-jobs.sql`.

The authorized demo cleanup removed 50 seeded accounts, eight demo companies and 519 unreferenced files. One real account remains. The private pre-cleanup database backup exists but has not been restore-tested and does not include the deleted media. `scripts/cleanup-demo-data.mjs` is an explicit inventory/apply tool, not a recurring deletion job.

The moderation and AT Protocol identity migrations `20260922141011`, `20260922142915` and `20260922150131` were applied and recorded on 22 September. Their isolated regressions cover hidden content, author/moderator boundaries, approval, re-edits, notifications, media access, identity ownership, one-time OAuth state and expiring locks. Hosted OAuth sign-in still requires the activation checks in [moderation and AT Protocol](moderation-and-atproto.md).

## Release procedure

1. Confirm the exact backend reference and current schema. Make a restorable backup of the database, files and required secrets before a schema or storage change.
2. Rehearse new migrations in an isolated environment. The retained schema fixtures cover policy behavior; the full historical migration chain has not been verified from an empty database.
3. Apply new migrations and matching server handlers before publishing the dependent frontend. Record each migration. Git synchronization alone does not verify a backend deployment.
4. Run the README checks and isolated database regressions. Publish the resulting frontend and verify the actual deployment revision.
5. Check unauthenticated denial and real authenticated operations. Monitor scheduler failures, overdue deletion requests and federation delivery retries. Do not roll back a privacy migration by reopening access to hidden records.

## Remaining broader launch work

- Complete signup, confirmation, recovery, MFA, onboarding, profile editing, messaging, company ownership, export and deletion journeys using separate test accounts on desktop and mobile.
- Complete the [Mastodon interoperability checks](federation-launch-checklist.md). Public-domain discovery passes for `jonatan_tensetti@nolto.social`; signed exchanges with an independent server remain unverified.
- Restore the retained backup into an isolated backend with Auth and Storage. Establish backup expiry, key custody and a deletion manifest that prevents restored data from becoming visible again.
- Confirm gateway rate limits, private-network egress restrictions, alert delivery and the person responsible for incident response. Database request logs are not an abuse-prevention layer.
- Review the retained actor signing identity: earlier client-readable key paths were closed, but copied keys cannot be recalled. Rotate an exposed key pair through a controlled server procedure while preserving actor URLs.
- Verify actual providers, regions, processing/transfer agreements, backup/log retention and operator contact details against the privacy notice.
- Measure page loading and media costs on mobile and under realistic traffic. The production bundle still needs performance measurement.

## Scope limits

Mastodon linking is not full synchronization of histories, private messages, bookmarks, preferences or CV data. Local replies, boosts and quote reposts need further federation acceptance testing. Locked-account approval needs an owner-facing workflow before exposing that setting.

Inbox E2EE has no forward secrecy or key-rotation/recovery workflow. Losing the inbox phrase loses access to those messages. See [privacy and deletion](privacy-and-deletion.md) for the complete threat model and retention behavior.

Account exports fail above their configured size/row limits and require assisted handling; they are not a single cross-table point-in-time snapshot. Large federation fan-out, independent Auth/Storage failures and deletion backlog need hosted load and recovery tests.

True per-user Bluesky accounts such as `name.nolto.social` require a PDS and account provisioning. No PDS is deployed. The operator has a zero budget and has ruled out a server that costs money; no paid hosting purchase is planned. Existing Bluesky sign-in remains a separate identity-linking feature. `ATPROTO_DID` is unset.

## Federation routing

Keep `FEDERATION_DOMAIN=nolto.social` stable. Worker Routes over the existing frontend origin are active; the website and federation both use the apex, and www redirects to it. The alternative mode uses a Custom Domain on the apex and a website on www. See [the activation guide](nolto-activation.md) for the current deployment and the different DNS, Lovable primary-domain, SITE_URL and Worker settings required for that alternative.

## Federation routing on the hosted nolto.social domain

On 23 September, Worker `nolto-federation` version `6604260d-58eb-4f31-b56f-a629d586ba83` is live with seven routes. Gateway changes were merged in PR #77 at `bb5c0d474a588af531a67bdf8d1c0e67c4935f80`. The zone uses `corey.ns.cloudflare.com` and `dawn.ns.cloudflare.com`; the proxied apex CNAME points to `fediverse-career-newest.lovable.app`. Full (strict) TLS and website HTTP 200 are verified. All eight gateway checks and public federation discovery for `jonatan_tensetti@nolto.social` pass.

The proxied www A record is `192.0.2.1`; Cloudflare rule **WWW to nolto.social** returns HTTP 308 to the apex with path and query preserved, verified over HTTP and HTTPS. Cloudflare DNSSEC signing is enabled and its new DS record was added successfully at one.com. At 06:46 UTC on 23 September the matching DS and A responses were validated with the AD flag through Google and Cloudflare. See the activation guide for the DS details.

`deploy/wrangler.jsonc` is the active same-domain Worker Route configuration. `deploy/wrangler.split.jsonc` is the alternative configuration for an apex Custom Domain and a www website; it does not proxy Lovable traffic. Before adopting that alternative, replace the www redirect DNS record, disable the Cloudflare www-to-apex rule and set www as the primary Lovable domain. With an authenticated Cloudflare account, the same-domain deployment commands are:

```sh
npm --prefix deploy ci
npm --prefix deploy run check
npm --prefix deploy run deploy
node scripts/check-federation.mjs jonatan_tensetti@nolto.social
```

The Worker intercepts discovery, nodeinfo, `/functions/v1/*`, `/api/v1/*`, `/api/v2/*`, `/oauth/token` and `/oauth/revoke`; other navigation goes to the existing origin without changing the browser's canonical origin. This keeps OAuth callbacks and browser-bound state on nolto.social. Signed inbox request bodies and Signature/Digest headers are preserved; untrusted forwarded-host input is dropped. No Supabase service key belongs in the Worker.

Do not report full Mastodon interoperability: signed Follow / Accept / Note / reply / Like / Undo exchanges with an independent peer remain unverified, and client API features listed below are unsupported. WebFinger is discovery, not a login protocol. The experimental Mastodon client API and OAuth server are open to all Nolto accounts; user-specific operations require explicit consent and a scoped user token. Bluesky sign-in establishes identity in Nolto; it does not by itself provision a PDS account, publish posts or bridge likes between protocols.

## Prepared post images and profile import

The two migrations `20260922172010` and `20260922172019` were deployed on 22 September and their canonical versions recorded after comparing the hosted SQL with the repository. The managed deployment also recorded copies as `20260922182138` and `20260922182332`; those files are retained as tracking markers so replay executes the schema once. The platform skipped the bucket SQL, so the private posts bucket was separately verified and set to 512,000 bytes and JPEG only. The regression runner now replays all later migration files to catch duplicated DDL.

The matching inbox, federation, outbox, objects, activities, public-media and privacy-maintenance functions were deployed. The minute-by-minute cleanup schedule remains active. The repaired Bluesky start endpoint returned HTTP 200 with a Bluesky authorization URL and reports ready; full interactive sign-in still needs a user session. Managed Google and Apple starts were verified through their real provider redirects. Public-domain routing was verified separately as described above; Phanpy acceptance is recorded below.

Post composers compress to JPEG, at most 1920 pixels per dimension and 500 KiB, then upload immediately on selection. The storage path starts with the authenticated owner's UUID. Original files are never uploaded if compression fails. Publication attaches a ready upload in the same database transaction; retry uses the same post ID. The private media gateway only releases published, visible content. Unattached uploads expire after 24 hours and the existing privacy worker removes them; discarded uploads become eligible immediately. Remote media remains a linked/proxied resource with no copy in Storage, although delivery consumes bandwidth.

The profile-import guide is `/integrations`, linked from `/hosting`. `public/embed/nolto-profile.js` requests explicit, one-time consent in `/share-profile`. The recipient origin, popup source and random request ID are checked. Only selected fields are sent, without any session credentials. See `docs/profile-import.md` for the contract.

## Experimental native client implementation

The experimental Mastodon client API subset and OAuth server are enabled for all Nolto accounts with `MASTODON_CLIENT_ENABLED=true`. Users explicitly consent to each app and can revoke access. Migration `20260922184945` and matching handlers are deployed; seven tables, two invoker views, two ID triggers and the cleanup RPC are verified. `/oauth/authorize`, `/~oauth/*` and browser callbacks stay on the frontend. See [Mastodon client access](mastodon-client-access.md) for the supported subset, security model and verification procedure. Supabase control-plane access remains denied for the connected account; deployment and runtime configuration succeeded through Lovable.

PR #78 passed all three CI jobs and merged as `d4c91e3905fa93c7120ea7bc3940e3b3895de52e`. Canonical migration `20260923065928` repaired onboarding without granting access to Auth tables or changing actor keys. Onboarding completed in the signed-in browser. Phanpy verified OAuth login, the correct identity, profile/home reload, public text posting, replies, likes and unlikes. Both test posts were deleted through Nolto. App revocation blocked the home feed and left zero active grants; reconnection succeeded. Independent signed peer Follow/Accept remains unverified. These tests establish the listed Phanpy behavior, not compatibility with every client or support for native media uploads, boosts, private messages and other unimplemented features.

Live full-mode checks passed after the API/OAuth handlers were redeployed: discovery and anonymous public feeds returned 200; a temporary app could register, obtain client credentials, verify itself and read public data. Its token received 401 for user identity and home. Revocation succeeded and subsequent feed/app-verification requests with that token returned 401. The temporary registration and cascading grants were removed, while the user's reconnected Phanpy grant remains active.

The operator pilot list is retained as a rollback option. Setting the full flag to false restricts account consent, code exchange and existing token use to the configured Auth user UUIDs; removing the list also disables discovery and account operations. Authenticated grant management/revocation remains available. The software's default remains off; the live full flag explicitly enables only the implemented experimental subset. See the client guide for parsing, revocation and removal behavior.
