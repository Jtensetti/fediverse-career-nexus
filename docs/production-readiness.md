# Deployment and launch requirements

Updated 23 September 2026. The service is not yet cleared for an unrestricted public launch. Passing local checks does not establish hosted-service behavior.

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

The moderation and AT Protocol identity migrations `20260922141011`, `20260922142915` and `20260922150131` were applied and recorded on 22 September. Their isolated regressions cover hidden content, author/moderator boundaries, approval, re-edits, notifications, media access, identity ownership, one-time OAuth state and expiring locks. Hosted OAuth sign-in still requires the activation checks in [moderation and AT Protocol](moderation-and-atproto.md).

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

Keep `FEDERATION_DOMAIN=nolto.social` stable. The gateway supports two explicit modes: Worker Routes over an existing frontend origin, or a Custom Domain on the apex that redirects browser navigation to www. See [the activation guide](nolto-activation.md) for the matching DNS, Lovable primary-domain, SITE_URL and Worker settings. Installing and verifying a gateway remains an operational task.

## Federation routing on the hosted nolto.social domain

The 2026-09-22 production probes returned 404 for WebFinger and the SPA HTML for the canonical actor URL. The backend WebFinger endpoint resolves the real local handle correctly. Lovable's static hosting does not apply the repository's `_redirects`, Vercel rewrites or Caddy configuration. A backend deployment alone cannot fix this routing.

`deploy/wrangler.jsonc` is the same-domain Worker Route configuration. It requires a proxied domain and Lovable's supported proxy connection mode. `deploy/wrangler.split.jsonc` is the separate configuration for an apex Custom Domain and a www website; it does not proxy Lovable traffic. The observed www → apex redirect must be removed by setting www as the primary Lovable domain before using that mode. With the matching domain setup and an authenticated Cloudflare account, the same-domain example is:

```sh
npm --prefix deploy ci
npm --prefix deploy run check
npm --prefix deploy run deploy
node scripts/check-federation.mjs jonatan_tensetti@nolto.social
```

The Worker only intercepts discovery and `/functions/v1/` paths; the rest goes to the existing origin without changing the browser's canonical origin. This keeps OAuth callbacks and browser-bound state on nolto.social. Signed inbox request bodies and Signature/Digest headers are preserved; untrusted forwarded-host input is dropped. No Supabase service key belongs in the Worker. The repo's connected tools do not currently have access to that Cloudflare zone, so this routing has not been deployed.

Do not report Mastodon compatibility until the public-domain probe passes and a signed Follow / Accept / Note / reply / Like / Undo exchange is exercised with a real peer. WebFinger is discovery, not a login protocol. Logging into a Mastodon client as a Nolto account additionally requires the Mastodon client API and OAuth server; their endpoints currently return 410. A Nolto AT Protocol account usable in Bluesky requires PDS hosting and domain-handle provisioning. Bluesky sign-in establishes identity in Nolto; it does not by itself publish posts or bridge likes between protocols.

## Prepared post images and profile import

The two migrations `20260922172010` and `20260922172019` were deployed on 22 September and their canonical versions recorded after comparing the hosted SQL with the repository. The managed deployment also recorded copies as `20260922182138` and `20260922182332`; those files are retained as tracking markers so replay executes the schema once. The platform skipped the bucket SQL, so the private posts bucket was separately verified and set to 512,000 bytes and JPEG only. The regression runner now replays all later migration files to catch duplicated DDL.

The matching inbox, federation, outbox, objects, activities, public-media and privacy-maintenance functions were deployed. The minute-by-minute cleanup schedule remains active. The repaired Bluesky start endpoint returned HTTP 200 with a Bluesky authorization URL and reports ready; full interactive sign-in still needs a user session. Managed Google and Apple starts were verified through their real provider redirects. These checks do not establish the domain routing or native client support described above.

Post composers compress to JPEG, at most 1920 pixels per dimension and 500 KiB, then upload immediately on selection. The storage path starts with the authenticated owner's UUID. Original files are never uploaded if compression fails. Publication attaches a ready upload in the same database transaction; retry uses the same post ID. The private media gateway only releases published, visible content. Unattached uploads expire after 24 hours and the existing privacy worker removes them; discarded uploads become eligible immediately. Remote media remains a linked/proxied resource with no copy in Storage, although delivery consumes bandwidth.

The profile-import guide is `/integrations`, linked from `/hosting`. `public/embed/nolto-profile.js` requests explicit, one-time consent in `/share-profile`. The recipient origin, popup source and random request ID are checked. Only selected fields are sent, without any session credentials. See `docs/profile-import.md` for the contract.

## Experimental native client implementation

The repository now includes a gated Mastodon client API subset and OAuth server, explicit consent and app revocation UI. It is not deployed or enabled on nolto.social. The public Worker/Caddy/Netlify/Vercel examples also route `/api/v1/*`, `/api/v2/*`, `/oauth/token` and `/oauth/revoke`; `/oauth/authorize`, `/~oauth/*` and browser callbacks stay on the frontend. The domain currently uses One.com nameservers; a Cloudflare Worker still needs a suitable proxied zone setup and administration access. See [Mastodon client access](mastodon-client-access.md) for the security model, exact supported subset, limitations and deployment acceptance gate. Supabase project access remains denied for the connected account. Production probes still return 410 from the backend stubs, 404 from WebFinger, and SPA HTML from `/api/v1/instance` on the public domain.
