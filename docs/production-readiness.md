# Nolto production readiness — 21 September 2026

This branch is a release candidate, not a certification that the live service is production ready. The implementation and local checks below are complete. The existing Lovable Cloud backend is now identified and a read-only production preflight has run. Deployment, a staging migration rehearsal, a real Mastodon round trip and the operator's legal details remain release gates.

## Verified Lovable Cloud backend

Verified on 21 September 2026 through the owner's authenticated Lovable connection:

| Resource | Verified value |
| --- | --- |
| Lovable project | [fediverse-career-newest](https://lovable.dev/projects/aaae6ed4-598c-43d7-b7d3-0c838ee77f5b) |
| Cloud status | Enabled; Supabase stack |
| Backend project ref | `anknmcmqljejabxbeohv`, confirmed by the project's `supabase/config.toml` |
| GitHub repository | `Jtensetti/fediverse-career-nexus` |
| Lovable source revision | `7b9df22372e44c38b21107df89f6e07106d06728`, also the observed GitHub `main` head |
| Release candidate | [Draft PR #54](https://github.com/Jtensetti/fediverse-career-nexus/pull/54), not merged or deployed |

Lovable Cloud uses Supabase's open-source foundation but is managed through Lovable. The owner's separate Supabase connection lists the historical Frikopplad project and an unrelated game project; its access denial for this Cloud backend was not evidence that the backend had been deleted. Continue in the existing Cloud project. A replacement Supabase project or a database-provider migration is unnecessary. See [Lovable Cloud](https://docs.lovable.dev/features/cloud).

`scripts/inspect-production.sql` is a repeatable read-only preflight for the Lovable database connector or Cloud SQL editor. It returns counts and schema/privilege metadata without selecting personal details, signing keys or tokens. Its verified result was:

- 51 auth users: 50 match both the boolean `seeded: true` marker and the reserved `@demo.nolto.local` domain; 1 account is outside the cleanup target set and must be preserved.
- 50 actors belong to those demo users. There are 8 companies in total; this count alone does not qualify them for deletion. Company provenance and non-demo contributions still need the cleanup script's checks.
- No duplicate case-insensitive profile usernames, duplicate local actors, profile/actor username mismatches, or incomplete local key pairs were found. All required relations and the partition-key function exist. This checks specific preconditions, not full migration compatibility or key validity.
- The delivery ledger, one-time OAuth state and verified remote-identity tables do not exist yet. The production-readiness migration has not been applied.
- Both client roles have a SELECT grant on the actor private-key column, and seven sensitive routines have client EXECUTE grants. These are privilege findings; RLS and function bodies also affect effective access. No signing-key values were read. Apply the coordinated key-access hardening below before launch.
- The federation queue contains 21 rows, all marked `processed` at inspection time.

Git's merge check found no conflicts with the two newer Lovable commits on `main`; they add preview auth storage and regenerate client types. No merge or production mutation was performed during this preflight.

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
| Direct messages | Local messaging remains separate. Federated DMs return an explicit unsupported response. No end-to-end encryption claim |
| Full mirroring | Not implemented: histories, private messages, bookmarks, every preference, CV fields and arbitrary Mastodon client APIs are not universally synchronized |
| AT Protocol | Not added. It does not replace ActivityPub interoperability with Mastodon |

Reference behavior: [Mastodon WebFinger](https://docs.joinmastodon.org/spec/webfinger/), [ActivityPub](https://docs.joinmastodon.org/spec/activitypub/), [HTTP signatures](https://docs.joinmastodon.org/spec/security/), [OAuth / PKCE](https://docs.joinmastodon.org/methods/oauth/), [migration limitations](https://docs.joinmastodon.org/user/moving/), [AT Protocol overview](https://atproto.com/guides/overview).

## Deploy in this order

1. Work in the existing Lovable project above and back up its exact backend `anknmcmqljejabxbeohv`. Re-run `scripts/inspect-production.sql` and refresh the cleanup inventory before changes. Verify a restorable backup, including the retained account and signing identities; neither GitHub history nor the SQL counts are a data backup. Lovable's [Cloud export](https://docs.lovable.dev/features/advanced-settings#export-lovable-cloud-data) excludes storage files, Edge Function code and secrets, and does not provide usable migrated passwords. Confirm the actual restore procedure and protect the separate assets. No live database mutation, function deployment, domain edit or data deletion has been performed in this work.
2. Rehearse `20260921164838_nolto_identity_and_federation_security.sql` against a staging copy. It aborts on duplicate case-insensitive handles or multiple local actors per user. Reconcile these explicitly; do not silently merge federated identities. The repository's older migration history was not replayed from scratch.
3. Take a maintenance window and apply the migration and matching function versions together through the existing Lovable Cloud environment. Keep registrations and federation paused during the transition. Ordinary clients lose access to signing keys and privileged signing/queue RPCs. Test both anonymous and authenticated roles against the actual schema, including existing policies and views. Git sync or a successful frontend publish alone does not verify SQL migration or function deployment. Lovable manages [Edge Function deployment](https://docs.lovable.dev/features/edge-functions); verify the deployed versions and invocation results in Cloud.
4. Deploy the changed functions: `webfinger actor inbox outbox objects activities followers following host-meta nodeinfo create-user-actor send-follow send-move federation federated-auth-init federated-auth-callback sync-federated-profile auth-signup auth-confirm-email import-follows-csv send-dm request-mfa-recovery admin-issue-mfa-recovery seed-demo-users generate-actor-keys follower-batch-processor key-manager`. The last four are **410 tombstones** so an already-deployed seed, key-export or legacy worker endpoint is actually retired. Merely deleting local source would leave it live.
5. Set `FEDERATION_DOMAIN=nolto.social`, `SITE_URL=<actual HTTPS UI origin>`, a strong existing-compatible `TOKEN_ENCRYPTION_KEY`, and the email provider secret. Retain Supabase's own project URL/service key on the server only. Add the exact UI callback `/auth/callback` and email redirect to Supabase's allowlist. PKCE support is available in Mastodon 4.3+; test the minimum supported version.
6. Route `nolto.social/.well-known/webfinger` and the canonical `/functions/v1/…` federation endpoints to the backend **before** a website redirect or SPA fallback. `vercel.json` and `public/_redirects` cover hosts that support external rewrites. If the UI remains on a different domain behind Cloudflare, use `deploy/nolto-gateway.mjs` with `SUPABASE_ORIGIN=https://anknmcmqljejabxbeohv.supabase.co` and `SITE_ORIGIN=<UI origin>`. Remove/precede conflicting Cloudflare redirect rules. The Worker is supplied but not deployed.
7. Schedule authenticated POSTs to the `federation` function using the service-role credential in secret storage, never the browser. Omitting `partition` visits all 16 partitions; otherwise schedule all 16 partitions. Start with `{"limit":5}`. Alert on growing oldest-pending age, failed jobs and processing jobs older than ten minutes. The worker is suitable for controlled launch validation; load-test large follower fan-out and tune batching/runtime limits before scaling. Claims allow one unfinished event per actor; a delayed retry blocks later events. Start with one worker and verify ordering and runtime limits under load. Disable the old `follower-batch-processor` schedule and reconcile any legacy batches before retiring that queue.
8. Build with `npm ci && npm run lint && npm test && npm run check:edge && npm run build`; deploy the static output only after backend readiness. Use Node 22.12+ or 24. A single npm lockfile pins frontend dependencies; changed federation/auth functions use an exact Supabase SDK and native Deno/WebCrypto/fetch. MFA recovery email now uses Resend directly; it no longer needs the Lovable gateway or its API key.

### Key and account continuity

Previously public key-returning RPCs and browser-held private keys are a security exposure. Revocation protects future reads, but cannot retract a key that was already copied. For retained real accounts, review exposure and rotate signing keys **atomically as a pair** through an authorized server-side procedure; preserve actor URLs and never temporarily null both keys to permit a username change. Do not rotate Supabase service credentials or token-encryption keys blindly: assess their separate impact and reauthentication requirements.

OAuth associations now use a server-only identity table. Existing legacy Mastodon users need a verified association before their old profile can be used for federated sign-in. Do not backfill by a profile URL or editable `user_metadata` alone. Have a signed-in Nolto user link the Mastodon account, or perform an operator-verified migration. A remote server must never gain access to an existing user merely by returning that user's profile URL.

## Remove seeded data

The seed function and fabricated marketing profiles/posts are removed. The cleanup is deliberately separate from the schema migration.

The production preflight above has identified the 50 marked demo accounts without deleting anything. This does not yet produce the cleanup script's complete manifest. The script below requires server-side admin credentials in the authorized runtime; the Lovable SQL connection does not supply those credentials. Do not export server credentials into frontend code to run it.

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

The five legal pages share navigation and Swedish/English content. Removed invented technical infrastructure, unverified Swedish hosting/WCAG/GDPR badges, full-sync promises and end-to-end encryption claims. The existing contact address was preserved; no new legal entity was invented.

Before publication, the operator must supply/confirm: legal controller identity and address, operational contact, actual subprocessors and regions, data-processing/transfer arrangements, retention periods including logs/backups, incident and deletion procedures, and the proposed 16+ service rule. Review against the actual deployment and the intended audience, not just source code. Relevant guidance: [IMY: information to data subjects](https://www.imy.se/privatperson/dataskydd/dina-rattigheter/ratt-till-information/) and [legal bases](https://www.imy.se/verksamhet/dataskydd/det-har-galler-enligt-gdpr/rattslig-grund/). The revised copy is not a claim of legal compliance.

## Local verification

- TypeScript app/config checks and production build.
- Two native Node tests for conservative demo selection; 15 Deno tests for canonical identity, parser rejection, actor ownership, real RSA signature verification/tampering, response-size boundaries, SSRF filters, PKCE vector, object normalization and partial delivery failure/retry.
- New migration applied to an isolated PGlite/PostgreSQL fixture; assertions cover opt-in, stable keys, immutable handles, key/RPC privileges, private outbox exclusion, transactional Update/Delete plus tombstones, delivery ordering and confirmation-token throttling/permissions. See `scripts/test-support/`. This does not establish compatibility with every historical production migration or policy.
- npm audit after the upgrades: zero reported vulnerabilities on 21 September 2026. An advisory scan is not a security audit.

Reproduce the isolated SQL checks without changing the application dependency tree:

```sh
npm install --prefix /tmp/nolto-pg --no-audit --no-fund @electric-sql/pglite@0.5.8
node scripts/test-support/run-identity.mjs /tmp/nolto-pg/node_modules/@electric-sql/pglite/dist/index.js
```

GitHub CI runs the frontend checks, all 27 maintained Edge Function entrypoints and the isolated migration regression. The production build still reports a main JavaScript chunk of about 931 kB (274 kB gzip); measure mobile loading and split further before a wider launch. Local boosts/quote reposts and replies are not yet a complete federated interaction model; do not advertise full Mastodon feature parity. Local locked-account approval needs an owner-facing workflow before enabling that setting in the UI.

Outstanding operational work is explicit above. In particular, live demo deletion, real Mastodon interoperability and UI acceptance have not been performed in this session.
