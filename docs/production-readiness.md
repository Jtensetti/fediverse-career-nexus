# Nolto production readiness — 22 September 2026

The security and privacy backend changes have been deployed to the existing Lovable Cloud project with the owner's authorization. This is not a certification that the service is production ready: authenticated browser acceptance, a real Mastodon round trip, custom-domain routing, restore rehearsal and provider retention arrangements remain open. Jonatan Tensetti is the confirmed creator and operator.

## Verified Lovable Cloud backend

Verified on 21 September 2026 through the owner's authenticated Lovable connection:

| Resource | Verified value |
| --- | --- |
| Lovable project | [fediverse-career-newest](https://lovable.dev/projects/aaae6ed4-598c-43d7-b7d3-0c838ee77f5b) |
| Cloud status | Enabled; Supabase stack |
| Backend project ref | `anknmcmqljejabxbeohv`, confirmed by the project's `supabase/config.toml` |
| GitHub repository | `Jtensetti/fediverse-career-nexus` |
| Release history | PRs #54 and #55 merged; backend deployment recorded at `7cc66a1`. [PR #56](https://github.com/Jtensetti/fediverse-career-nexus/pull/56) removes the browser host redirect that could loop against hosting rules |

Lovable Cloud uses Supabase's open-source foundation but is managed through Lovable. The owner's separate Supabase connection lists the historical Frikopplad project and an unrelated game project; its access denial for this Cloud backend was not evidence that the backend had been deleted. Continue in the existing Cloud project. A replacement Supabase project or a database-provider migration is unnecessary. See [Lovable Cloud](https://docs.lovable.dev/features/cloud).

## Completed Cloud rollout, 22 September 2026

- Applied and recorded migrations `20260921164838`, `20260921195208`, `20260922041529`, `20260922041921` and `20260922065026`. Local PostgreSQL rehearsals passed; no actual staging Auth/Storage restore was claimed.
- Deployed the existing security/privacy handlers through Lovable. Retired the deployed demo seed and scheduled database-wipe endpoints. The scoped moderation endpoint and matching frontend are the final publication step of this rollout.
- Verified that client roles cannot select actor private keys or retained snapshots, and all eight Storage buckets are private. The deliberate public-profile projection continues to hide CV/private fields; do not blindly replace it with an invoker view and broader profile grants.
- Confirmed the retention secret is installed without exposing its value. Vault supplies the scheduler credentials at runtime. `privacy-maintenance` runs every minute; successive scheduled HTTP responses were 200 with zero failures and no pending deletion requests. `scripts/configure-cloud-jobs.sql` maintains the authenticated schedules and disables the legacy wipe. Federation is scheduled directly through the delivery worker with a small batch, avoiding the legacy coordinator's extra calls.
- Deleted exactly 50 users matching both the boolean seed marker and reserved demo email domain through the Auth API. Deleted eight companies after matching seed provenance and ruling out non-demo contributions. Two transient Auth deletion errors succeeded on individual retry. One real account, its profile and actor remain; posts, articles, comments, jobs, events, companies and starter packs are empty.
- Removed 519 old application files after checking current owners and references. All 12 Storage API deletion batches returned HTTP 200. The only remaining Storage object is the private 8,478,222-byte Cloud database backup created before the cleanup. The backup is not restore-tested and does not include deleted Storage files.
- The public Lovable preview landing page loaded. The editing browser's policy blocked `nolto.social`; the custom-domain redirect chain and authenticated flows remain unverified. Removal of the client redirect is a concrete loop-prevention fix, not evidence that every hosting rule is correct.

`scripts/inspect-production.sql` remains the read-only preflight. The original inventory was 51 Auth users, 50 demo actors, eight companies, zero legacy messages and no duplicate handles or actor/profile mismatches. Before the migrations, browser roles had signing-key/RPC grants and the application buckets were public; the access changes above now supersede that initial finding.

## Findings addressed in this release candidate

The review compared application code with the deployed Cloud schema: 83 public relations, 200 policies, 68 functions and their grants. The schema fixture contains definitions only, without production user records or secret values.

| Area | Gap found | Change prepared |
| --- | --- | --- |
| Sessions and MFA | Client-side MFA alone did not constrain database access or privileged functions; revoked JWTs could remain useful | Database policies require a live Auth session and the account's MFA assurance; server handlers independently verify the token, live session and assurance |
| Messages | Encryption failure could fall back to plaintext; decrypt filters accepted unvalidated identifiers; reads could truncate | Browser-encrypted and signed new sends, ciphertext-only API, participant RLS, bounded cursor pagination and explicit failure |
| Encryption | Duplicated modules truncated the secret and token decryption could accept plain base64 | One versioned AES-GCM implementation, purpose-separated HKDF keys, full-secret derivation and tamper rejection; authenticated legacy ciphertext remains readable |
| Profile privacy | CV views could expose sections hidden only by the interface | Visibility enforced before CV data leaves PostgreSQL; public-post visibility is explained separately |
| Record integrity | A user could alter trust flags, approve their own relationships or forge company associations | Column grants, ownership policies, pending-only requests, employment verification checks and transactional organisation creation |
| Notifications | Client inserts were denied by RLS, losing connection/recommendation/endorsement notices | Transactional database triggers for those events; message notices contain no private message text |
| Feed | Filtering after fetching could skip followed posts; a private Mastodon timeline was fetched with insufficient OAuth scope | Following filters run before pagination; public inbound ActivityPub content is used in the federated feed; the private-timeline endpoint is retired |
| Export | Partial queries and unrelated records could be presented as a complete archive | Explicit ownership/projections, complete paginated reads or failure, size limits, legacy readable messages, new E2EE ciphertext and file metadata; one honest JSON format |
| Account deletion | Non-FK records and raw post content could survive; organisations could lose their owner | Deletion preflight, recent authentication, immediate hiding, 30-day queued purge, encrypted retention snapshots/files, storage API removal, last-owner protection and retired usernames |
| Recovery | Duplicate password-reset logic and replay-prone MFA recovery | Native Auth password recovery; recovery tokens claimed atomically, bound to a live signed-in account and used once |
| Remote fetches | Preview/media/lookup paths had weak remote-request boundaries | HTTPS/public-address checks, redirect rejection, response/type/size limits; authenticated metadata lookup |
| Product copy and maintenance | Fabricated people, unused sales components, false verification and guarantees | Removed fake avatars/CV verification, 13 unused marketing components, 44 debug log statements and obsolete translation blocks; concise Swedish/English help and legal navigation |

Removed unused ESLint packages and their dependency tree: the resolved npm graph fell from 649 to 560 packages. The `lint` alias remains for compatibility and runs the explicitly named `check:types`; it is a TypeScript check, not a claim that ESLint ran. Frontend and Edge Functions use pinned packages, native fetch/WebCrypto and a single npm lockfile plus Deno's lockfile. The application still depends on established libraries such as React, Supabase, TanStack Query, Radix and Tiptap.

## Identity and interoperability

The permanent local address is `username@nolto.social`; the leading `@` is optional when presenting it. It is not email. `FEDERATION_DOMAIN=nolto.social` defines ActivityPub identifiers independently of the UI's `SITE_URL`. The web UI can live at `https://nolto.tensetti.io` without changing published identities.

| Operation | Implementation / limit |
| --- | --- |
| Discovery | WebFinger JRD, exact local-resource validation, rel filtering, GET/HEAD; no writes during discovery |
| Actor | A real server-managed RSA key, canonical owner/keyId and collections; no private keys in browser responses |
| Account creation | Username committed by the auth trigger, unique case-insensitively; 3–30 letters/digits/underscores; reserved names rejected |
| Local-only use | Internal actor can exist disabled without a signing key; posting does not silently enable federation |
| Federation opt-in | Generates keys atomically; published username is immutable; existing private keys never rotate during ordinary provisioning |
| Mastodon sign-in/link | Server-side one-time state, S256 PKCE, narrow `read:accounts` scope, exact callback, issuer + remote account ID binding; link existing Nolto accounts explicitly in profile settings |
| Follow / unfollow | Authenticated ownership check, actual remote inbox, signed requests, stable Follow IDs and matching Accept/Reject |
| Public content | Create/Update/Delete are queued by the database transaction; read-only outbox; resolvable object IDs; deletion tombstones |
| Delivery | Service-only worker, retries, stale-job recovery and per-inbox success receipts; partial failure is not reported as full success |
| Account move | Destination must list the source as `alsoKnownAs`; outgoing Move and `moved_to` are committed together; recipient servers decide whether to accept |
| Follow CSV | Batches of 20, duplicate filtering, partial failures shown |
| Direct messages | New local private text uses browser E2EE after both inboxes are enabled. Legacy/server-readable data is labelled. Federated DMs remain unsupported; see the privacy threat model |
| Full mirroring | Not implemented: histories, private messages, bookmarks, every preference, CV fields and arbitrary Mastodon client APIs are not universally synchronized |
| AT Protocol | Not added. It does not replace ActivityPub interoperability with Mastodon |

Reference behavior: [Mastodon WebFinger](https://docs.joinmastodon.org/spec/webfinger/), [ActivityPub](https://docs.joinmastodon.org/spec/activitypub/), [HTTP signatures](https://docs.joinmastodon.org/spec/security/), [OAuth / PKCE](https://docs.joinmastodon.org/methods/oauth/), [migration limitations](https://docs.joinmastodon.org/user/moving/), [AT Protocol overview](https://atproto.com/guides/overview).

## Privacy extension

See [privacy and deletion](privacy-and-deletion.md) for the encryption boundaries, immutable-key/recovery limits, immediate hiding, 30-day purge, data minimisation, coordinated media cutover and outstanding Cloud acceptance checks. All six inspected application buckets were public; the new migration makes them private and routes media through publication/deletion checks.

## Deploy in this order

1. Work in the existing Lovable project above and back up its exact backend `anknmcmqljejabxbeohv`. Re-run `scripts/inspect-production.sql` and refresh the cleanup inventory before changes. Verify a restorable backup, including the retained account and signing identities; neither GitHub history nor the SQL counts are a data backup. Lovable's [Cloud export](https://docs.lovable.dev/features/advanced-settings#export-lovable-cloud-data) excludes storage files, Edge Function code and secrets, and does not provide usable migrated passwords. Confirm the actual restore procedure and protect the separate assets. The completed Cloud actions are recorded above; custom-domain changes and a restore rehearsal have not been verified.
2. Rehearse `20260921164838_nolto_identity_and_federation_security.sql`, then `20260921195208_nolto_account_and_data_boundaries.sql`, then the three 22 September privacy/moderation migrations described in the linked runbook, against a staging copy including Auth and Storage. The original security migrations have passed an isolated PostgreSQL rehearsal against the captured Cloud public schema; that does not emulate the live Auth/Storage services or PostgREST gateway. It aborts on duplicate case-insensitive handles or multiple local actors per user. Reconcile these explicitly; do not silently merge federated identities. The repository's older migration history was not replayed from scratch.
3. Take a maintenance window and apply all five migrations and matching function versions together through the existing Lovable Cloud environment. Keep registrations and federation paused during the transition. Ordinary clients lose access to signing keys and privileged signing/queue RPCs. Test both anonymous and authenticated roles against the actual schema, including existing policies and views. Git sync or a successful frontend publish alone does not verify SQL migration or function deployment. Lovable manages [Edge Function deployment](https://docs.lovable.dev/features/edge-functions); verify the deployed versions and invocation results in Cloud.
4. Deploy the maintained functions checked by `npm run check:edge` (62 entrypoint files, including the moderation shim and its imported handler). `supabase/config.toml` declares the entrypoint and JWT gateway setting for every function; authentication is enforced in the handlers. Verify that Cloud applies this configuration. Deploy the 410 responses too: `auth-login`, `fetch-home-timeline`, `follower-batch-processor`, `generate-actor-keys`, `jwks`, `key-manager`, `mastodon-api`, `middleware`, `migrate-legacy-messages`, `oauth-authorization-server`, `profile`, `send-newsletter`, `send-password-reset`, and `verify-reset-code`. The old `seed-demo-users` and `scheduled-data-wipe` deployments have been removed. Merely deleting source or redeploying the frontend leaves other old endpoints running. `send-dm` explicitly reports unsupported remote messaging. Retired Mastodon client/OAuth-server routes do not affect Nolto's separate Mastodon OAuth client or ActivityPub endpoints.
5. Set `FEDERATION_DOMAIN=nolto.social`, `SITE_URL=<actual HTTPS UI origin>`, a strong existing-compatible `TOKEN_ENCRYPTION_KEY`, the email provider secret, and a separate new `RETENTION_ENCRYPTION_KEY` (see the privacy runbook). Retain Supabase's own project URL/service key on the server only. Add the exact UI callbacks `/auth/callback` and `/auth/update-password` to Auth's redirect allowlist. Configure and test native Auth SMTP/recovery delivery separately from the Resend signup/confirmation functions. Set the server Auth password minimum to 12 as well; frontend validation alone does not govern the native signup/update APIs. PKCE support is available in Mastodon 4.3+; test the minimum supported version.
6. Route `nolto.social/.well-known/webfinger` and the canonical `/functions/v1/…` federation endpoints to the backend **before** a website redirect or SPA fallback. `vercel.json` and `public/_redirects` cover hosts that support external rewrites. If the UI remains on a different domain behind Cloudflare, use `deploy/nolto-gateway.mjs` with `SUPABASE_ORIGIN=https://anknmcmqljejabxbeohv.supabase.co` and `SITE_ORIGIN=<UI origin>`. Remove/precede conflicting Cloudflare redirect rules. The Worker is supplied but not deployed.
7. Schedule authenticated POSTs to the `federation` function using the service-role credential in secret storage, never the browser. Omitting `partition` visits all 16 partitions; otherwise schedule all 16 partitions. Start with `{"limit":5}`. Alert on growing oldest-pending age, failed jobs and processing jobs older than ten minutes. The worker is suitable for controlled launch validation; load-test large follower fan-out and tune batching/runtime limits before scaling. Claims allow one unfinished event per actor; a delayed retry blocks later events. Start with one worker and verify ordering and runtime limits under load. Disable the old `follower-batch-processor` schedule and reconcile any legacy batches before retiring that queue.
8. Schedule and monitor the authenticated `privacy-maintenance` worker every minute; follow the media/key cutover and the staging deletion/restore checks in the privacy runbook.
9. Build with `npm ci && npm run check:types && npm test && npm run check:edge && npm run build`; deploy the static output only after backend readiness. Use Node 22.12+ or 24. A single npm lockfile pins frontend dependencies; changed federation/auth functions use an exact Supabase SDK and native Deno/WebCrypto/fetch. Email uses the shared native Resend HTTP adapter. Regenerate `src/integrations/supabase/types.ts` from the migrated Cloud schema after deployment; the new RPC signatures are included in this candidate.

### Operational checks that still block public launch

- A staged restore of the retained private database backup and a verified ongoing backup policy. The pre-cleanup backup exists, but its restore procedure and expiry remain unverified.
- A staged browser test of signup, confirmation, native recovery, MFA recovery, message send/read, company creation, exports, file deletion and the user journey on desktop/mobile. The public Lovable preview landing page loaded, but the custom domain was blocked by the editing browser policy; authenticated acceptance remains open.
- A domain/gateway check using a known enabled account, then a real bidirectional Mastodon round trip. The gateway source is prepared, not deployed.
- Verify event reminders and digests under actual traffic, gateway rate limiting, egress controls, alert delivery and a restore/rollback owner. Federation, privacy maintenance, cleanup and event scheduler credentials have been configured. Maintenance APIs now require an administrator or service credential; event/digest workers accept only the service credential.
- Review of retained signing keys and the existing encryption secret. New ciphertext requires at least 32 random characters. Keep the old secret to read old AES-GCM records until an explicit re-encryption job has been tested. Old base64-only OAuth tokens are rejected and require relinking. Do not replace the secret just to satisfy the minimum: that could destroy access to existing encrypted data.
- Confirmation of operational contact details, processors/regions and retention terms described below. The operator has confirmed his identity as Jonatan Tensetti.

Account deletion now queues a 30-day background purge and a durable federation Delete attempt; follower reads are paginated. Large fan-out and remote acceptance still need load/integration tests. Storage removal, delivery and Auth deletion remain separate APIs with retry state. Organisation ownership and shared files block closure until transfer. Account exports have a 20 MiB / 50,000 rows-per-table ceiling and fail rather than quietly truncate; larger requests need assisted processing. They are not a single cross-table point-in-time database snapshot.

The cleanup used a separate inventory of contributions, ownership and files. The company-role foreign key was validated after verifying there were no missing users. Inspect remaining application features and logs under staging traffic, including interaction notifications, local boosts/replies and large-account pagination. Static and database tests do not establish every UI integration.

### Key and account continuity

Previously public key-returning RPCs and browser-held private keys are a security exposure. Revocation protects future reads, but cannot retract a key that was already copied. For retained real accounts, review exposure and rotate signing keys **atomically as a pair** through an authorized server-side procedure; preserve actor URLs and never temporarily null both keys to permit a username change. Do not rotate Supabase service credentials or token-encryption keys blindly: assess their separate impact and reauthentication requirements.

OAuth associations now use a server-only identity table. Existing legacy Mastodon users need a verified association before their old profile can be used for federated sign-in. Do not backfill by a profile URL or editable `user_metadata` alone. Have a signed-in Nolto user link the Mastodon account, or perform an operator-verified migration. A remote server must never gain access to an existing user merely by returning that user's profile URL.

## Remove seeded data

The seed function and fabricated marketing profiles/posts are removed. The cleanup is deliberately separate from the schema migration.

The authorized cleanup is complete, as recorded above. The script below remains available for a future explicitly authorized seed cleanup; it is not a standing instruction to remove new accounts. Server credentials must stay in the authorized runtime. The Cloud rollout used Vault-backed Auth/Storage API requests rather than exporting credentials to the client.
```sh
# Supply credentials via your existing secret manager / environment; do not commit them.
node scripts/cleanup-demo-data.mjs --project anknmcmqljejabxbeohv --output demo-cleanup.json
# Inspect the manifest and take a restorable backup before applying it.
node scripts/cleanup-demo-data.mjs --project anknmcmqljejabxbeohv --apply demo-cleanup.json
```

The script requires `SUPABASE_URL` to match `--project` exactly. It selects users only when both `user_metadata.seeded === true` and the reserved `@demo.nolto.local` email domain match. It gathers all pages before deletion. Companies need the exact old seed name, slug, original logo marker, unclaimed state and no verified status; any non-demo contribution causes manual review. A changed inventory stops the apply. Fake actors are disabled and their delivery jobs removed before cascades. The script stops on an API error; it is not a cross-API transaction. Take a new inventory after any partial run. Review residual storage files and skipped organizations separately; no blanket bucket purge is included. Ordinary accounts are not selected. A complete reset of real users needs a separately reviewed inventory and an explicit decision about retained accounts and content.

## Acceptance checks against staging and live

```sh
npm run check:federation -- actual_enabled_user@nolto.social
```

This read-only check requires nonredirected JSON discovery, canonical subject/self/actor/key URLs and readable outbox/follow collections. A 404 for an invented username alone does not prove discovery works. During editing, live probes did not establish a working known-account round trip; domain routing remains a release gate.

Then test with two real test accounts on separate servers:

- Email signup, confirmation, provider failure, resend cooldown, expired/reused links, chosen username, existing/invalid/reserved name errors; close/reopen onboarding and finish on a second device.
- Skip federation, publish locally, confirm no remote delivery. Enable it, confirm address discovery from Mastodon; verify a later username edit is rejected.
- Link Mastodon to an existing Nolto account and log in again. Confirm the Nolto ID/handle and edited bio are retained. Reject state replay, changed issuer, wrong logged-in Nolto session and an identity already linked elsewhere.
- Follow in both directions; Accept, locked-account approval, duplicate Follow, unfollow and Undo. Import a CSV with more than 20 rows and a failing remote account.
- Publish, edit and delete a public Note in both directions. Resolve its object URL. Confirm private/followers-only posts are rejected rather than exposed in the public feed. The current outbox is not a client-to-server posting API.
- Stop a receiving server, deliver to a second healthy server, resume the first and verify retries without resending the successful inbox. Crash a worker and verify stale-job recovery. Confirm Update/Delete do not overtake Create under the chosen scheduler.
- Enable TOTP, sign out/in, cancel the challenge, and simulate an assurance-check failure. Protected views must stay gated. Frontend gating is not a replacement for RLS/AAL policy review of every sensitive database/API operation.
- Review desktop/mobile pages, keyboard navigation, language switching, auth callback and all policy/back links. Local browser preview was blocked by the editing environment, so visual and authenticated browser acceptance is still open.
- Run a verified alias + Move round trip. Do not describe it as universal transfer of posts, contacts or files.

Remote requests reject non-HTTPS URLs, credentials, private IP literals, private DNS answers and redirects, and bound response sizes/time. DNS validation alone does not eliminate DNS rebinding: enforce private-network egress restrictions at the runtime/network layer. Add gateway rate limits independently of database request logging. Confirm allowed methods and public function JWT configuration in the deployed environment.

## Legal publication gate

The five legal pages share navigation and Swedish/English content. Removed invented technical infrastructure, unverified Swedish hosting/WCAG/GDPR badges, full-sync promises and unsupported encryption claims. This extension describes actual new local-message E2EE, its limits, legacy server-readable messages and the 30-day deletion flow. On 22 September 2026, the operator confirmed his identity as Jonatan Tensetti. The privacy policy now names him as controller for Nolto.social, the terms identify him as creator and operator, and all five pages show his name beside the existing contact email. Other federated servers remain responsible for their own processing. No company or postal address was invented.

Before publication, the operator must confirm: the operational contact and any further legally required operator details, actual subprocessors and regions, data-processing/transfer arrangements, retention periods including logs/backups, incident and deletion procedures, and the proposed 16+ service rule. Review against the actual deployment and the intended audience, not just source code. Hosting through a processor does not remove the controller's responsibility. Relevant guidance: [IMY: controllers and processors](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/personuppgiftsansvariga-och-personuppgiftsbitraden/), [information to data subjects](https://www.imy.se/privatperson/dataskydd/dina-rattigheter/ratt-till-information/) and [legal bases](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/rattslig-grund/). The revised copy is not a claim of legal compliance.

## Local verification

- TypeScript app/config checks and production build.
- Seven native Node tests for conservative demo selection and real OpenPGP round trips/adversarial messages; 23 Deno tests for canonical identity, parser rejection, actor ownership, real RSA signature verification/tampering, response-size boundaries, SSRF filters, PKCE vector, object normalization partial delivery failure/retry, encryption tampering/legacy reads, export pagination and malformed requests.
- Both new migrations applied to the captured Cloud public schema in isolated PGlite/PostgreSQL, with stand-ins for Auth/Storage, plus a focused identity fixture; assertions cover opt-in, stable keys, immutable handles, key/RPC privileges, private outbox exclusion, transactional Update/Delete plus tombstones, delivery ordering and confirmation-token throttling/permissions. See `scripts/test-support/`. Additional assertions cover live/revoked sessions, AAL1/AAL2, CV visibility, private messages, forged trust fields, request permissions, company ownership/atomic creation, feed pagination, data cleanup and retired username reuse. No production records were copied into these tests. This does not replace a staging service integration test.
- npm audit after the upgrades: zero reported vulnerabilities on 22 September 2026. An advisory scan is not a security audit.

Reproduce the isolated SQL checks without changing the application dependency tree:

```sh
npm install --prefix /tmp/nolto-pg --no-audit --no-fund @electric-sql/pglite@0.5.8
node scripts/test-support/run-identity.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
node scripts/test-support/run-account-boundaries.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
node scripts/test-support/run-privacy.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
```

GitHub CI runs the frontend checks, all 62 maintained Edge Function entrypoint files and all three isolated migration regressions. OpenPGP adds a separate lazy-loaded chunk of about 393 kB (134 kB gzip). The production build still reports a main JavaScript chunk of about 729 kB (215 kB gzip), reduced from 931 kB (274 kB gzip); measure mobile loading and split further before a wider launch. Local boosts/quote reposts and replies are not yet a complete federated interaction model; do not advertise full Mastodon feature parity. Local locked-account approval needs an owner-facing workflow before enabling that setting in the UI.

Live demo deletion is complete. Real Mastodon interoperability, authenticated UI acceptance, custom-domain verification and backup restore remain open. The new SQL regression also covers pre-deletion reports, role denial, report tampering, closed reports, expired archives and deletion of their access audit rows.
