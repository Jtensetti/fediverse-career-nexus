# Mastodon client access

This is an opt-in, experimental subset of the Mastodon client API. An operator-only pilot is **active on nolto.social**, with `MASTODON_CLIENT_ENABLED=false`. Public-domain routes, migration `20260922184945` and matching handlers are deployed. The seven tables, two invoker views, two ID triggers and cleanup RPC are verified. Discovery returns 200; unauthenticated account operations return 401. Full access still requires `MASTODON_CLIENT_ENABLED=true`. With neither full nor pilot access enabled, account operations and discovery return 503 before database access.

PR #78 deployed the pilot and repaired onboarding through canonical migration `20260923065928`. The service-only actor RPC no longer repeats the Edge Function's Auth check using a table it cannot read. Existing actor identity, keys and access restrictions are preserved. Live Phanpy testing on 23 September confirmed OAuth login, the correct account identity and a successful empty home timeline after reload. Public posting, social mutations, app revocation and signed exchanges with another server remain acceptance work; this is not unrestricted client compatibility.

Users select nolto.social as their server, sign in on Nolto with their existing method, then explicitly approve the app. Google, Apple, Bluesky and password sign-ins authorize the same local identity. Browser consent is at /oauth/authorize on SITE_URL. A same-tab return restores the consent request after password, Google, Apple, Bluesky or federated sign-in, without approving the app automatically. The saved return expires after 15 minutes and only permits the consent route. The website can be on www while the federation identity stays on the apex; /settings/apps lists and revokes app access and is linked from profile privacy settings. /mastodon-apps describes the limits.

## Implemented contract

| Operation | Endpoint |
| --- | --- |
| Discovery and capabilities | /.well-known/oauth-authorization-server, /api/v1/instance, /api/v2/instance |
| Registration and app verification | POST /api/v1/apps, GET /api/v1/apps/verify_credentials |
| Consent, exchange, revocation | GET /oauth/authorize, POST /oauth/token, POST /oauth/revoke |
| Accounts | /api/v1/accounts/verify_credentials, /api/v1/accounts/:id, /api/v1/accounts/lookup |
| Known-account prefix search | /api/v2/search?type=accounts&q=… |
| Feeds | /api/v1/timelines/home, /api/v1/timelines/public |
| Account posts and threads | /api/v1/accounts/:id/statuses, /api/v1/statuses/:id, /api/v1/statuses/:id/context |
| Public text posts and replies | POST /api/v1/statuses |
| Likes | POST /api/v1/statuses/:id/favourite, …/unfavourite, GET /api/v1/favourites |
| Follow known accounts | POST /api/v1/accounts/:id/follow, …/unfollow, GET /api/v1/accounts/relationships |

Posts support text, language, content warnings, sensitivity, reply targets and a bounded Idempotency-Key. Retry returns the same status; a reused key with different content returns 409. Private/unlisted visibility, media, polls and scheduling fail before writing. Content held for moderation is returned only to its author with HTTP 202 and nolto_moderation_status. Public feeds and federation exclude it until approved. Clients must handle that extension or direct users to Nolto for review status.

IDs are persistent decimal int64 strings mapped to existing UUIDs. Numeric max_id/since_id and Link headers paginate at most 40 statuses. Favourites use status ID order. Context is bounded to 20 ancestors and 100 candidate replies; large threads can be incomplete. Home applies following/connections, reply, muted-word and language preferences. Public timelines expose public content. Search/lookup does not fetch unknown servers; discover them in Nolto first.

Account-status requests with `pinned=true` or `pinned=1` return an empty list after the usual access and account checks. This lets clients load the optional pinned collection alongside ordinary posts; it does not add pinning support.

Existing image attachments link to their original or public-media URLs; this API makes no Storage copies. Remote markup becomes escaped text before entering a native client's HTML field. Public projections omit private contact fields, CV data, account keys and credentials. Active-month statistics count visible local post authors, identified by nolto.active_month_basis; they do not count passive readers.

Unsupported endpoints return explicit errors. Native image/video uploads, editing/deleting statuses, boosts, quotes, polls, bookmarks, notifications/push, streaming, DMs, profile editing and remote resolution are not implemented. Replies address the parent author through normal federation; additional remote mentions are not parsed into delivery recipients by this API. Use Nolto's website for supported media/editing/deletion workflows. Reserved push scope is accepted for registration compatibility but has no endpoint. Manual out-of-band OAuth callbacks are unsupported. Compatibility with Tusky, official Mastodon or other clients has **not** been established by live testing.

## Credential and data boundaries

- Secrets, codes and access tokens are random 256-bit opaque values. Only SHA-256 hashes are stored. No Nolto/Supabase JWT or refresh token is returned to an app.
- Redirects exactly match registered strings. Executable schemes, non-loopback HTTP, fragments, credentials and reserved response parameters are rejected. HTTPS, loopback HTTP and app-specific schemes are supported. Consent identifies app names/websites as developer-declared and unverified.
- Code exchange requires the registered client secret. Requested PKCE must use S256; plain PKCE is rejected. Codes expire in five minutes and are consumed atomically. Client credentials grants cannot impersonate a user or write.
- User grants expire within 30 days, cannot refresh, and are bound to the verified Nolto session and its MFA assurance. Session expiry/revocation, account deletion, bans or newly required MFA stop access. Global sign-out disconnects these clients; reconnect explicitly afterward.
- HTTP and database mutation boundaries both enforce scopes. Private capability tables enable RLS, revoke anon/authenticated access and explicitly grant the service role. Public projections use security_invoker. A restricted definer trigger allocates mapping IDs during normal user writes.
- Mutations derive ownership exclusively from the grant. Transaction-local claims reuse existing session/moderation helpers without minting JWTs. Legacy claim settings are cleared because hosted Auth helpers prefer them. Service-role operations explicitly check visibility, moderation, deletion, ownership and blocks instead of assuming RLS will protect privileged writes.
- Local follows reuse author_follows; remote Follow/Undo reuse the delivery queue, original Follow identity, signatures and retries. Favourites reuse the existing Like/Undo triggers. No duplicate social account or second feed is created.
- Registration, consent, exchange and authenticated requests have database-backed rate limits. The existing privacy worker cleans expired codes/grants, revoked grants, idempotency keys and rate counters. App registrations remain so installed clients can reconnect. App revocation deletes outstanding codes and all matching user grants in one transaction.

## Deployment and acceptance gate

The default is off. Exact `MASTODON_CLIENT_ENABLED=true` enables the existing full subset and takes precedence over the pilot setting. With that flag unset, empty or `false`, the optional `MASTODON_CLIENT_PILOT_USER_IDS` contains at most 100 comma-separated Supabase Auth user UUIDs. Surrounding whitespace and UUID letter case are normalized; an invalid entry, empty entry, oversized list or invalid enable flag fails closed with 503. Empty or absent pilot configuration keeps access off. Configure real verified user IDs only in the backend environment, never in source or browser input.

A valid pilot list opens instance/OAuth discovery, app registration and consent-request previews. All other Mastodon API reads and writes require an allowed user's token; anonymous feeds and userless `client_credentials` grants are unavailable. Consent checks the Auth-verified user, code exchange checks the stored code owner, and every token use checks the current allowlist in addition to existing session, MFA and scope rules. Removing a user blocks their outstanding codes and tokens on subsequent requests; it does not erase grants or restore revoked ones. Already-issued requests can complete. Revoke test grants after acceptance. Authenticated own-grant listing/deletion and client-authenticated token revocation remain available even when access is off or configuration is invalid.

Pilot mode is a test on the live service, not an isolated sandbox: an allowed user's posts and social actions can reach real peers. Keep `MASTODON_CLIENT_ENABLED=false` and select only consenting test operators. Do not infer compatibility with clients requiring app-only tokens from pilot tests.

1. Confirm migration 20260922184945_mastodon_client_access.sql is recorded once; it is already applied on production. Do not rerun it or generate a second executable copy.
2. Deploy mastodon-api, oauth-authorization-server and privacy-maintenance with all shared dependencies. The two public endpoints retain verify_jwt=false because their bodies implement scoped opaque-token authorization. Leave MASTODON_CLIENT_ENABLED false/unset and MASTODON_CLIENT_PILOT_USER_IDS absent until schema and gated deployment checks pass.
3. Confirm consent, connected-apps and guide pages match the backend deployment; these routes are present in the hosted frontend. Keep SITE_URL on the canonical browser HTTPS origin and FEDERATION_DOMAIN on the permanent federation domain.
4. Preserve the active same-domain configuration described in [nolto-activation.md](nolto-activation.md). Cloudflare Worker Routes from `wrangler.jsonc` now serve the canonical API and discovery paths; website navigation stays on nolto.social and www redirects to it. The examples forward /api/v1/*, /api/v2/*, /oauth/token, /oauth/revoke and discovery. /oauth/authorize, /~oauth/* and browser callbacks stay on the website. The alternative `wrangler.split.jsonc` requires www as the primary Lovable domain and removal of the current www-to-apex redirect; the route-mode fallback must never run as a Custom Domain origin. Lovable hosting does not apply repository proxy configurations automatically.
5. Prefer `MASTODON_CLIENT_ENABLED=true` in an isolated staging deployment. If no staging is available, keep the full flag false and configure the operator pilot list on the verified deployment. Run against the chosen origin:

       node scripts/check-mastodon.mjs https://staging.example.com

6. With a consenting test user and the intended native app, test registration → sign-in/MFA → explicit consent → callback → token → verify credentials → feeds → public post/reply/favourite/unfavourite/follow/unfollow. Check code replay, scopes, unsupported private posts, moderation and revocation. API-shaped responses alone do not prove native app compatibility.
7. Verify federation separately:

       node scripts/check-federation.mjs username@staging.example.com

   Exercise signed Follow/Accept/Note/reply/Like/Undo with a real peer.
8. Enable production only after these checks and update the guide's activation status. HTTP 410 means the old stub; HTTP 503 saying access is not enabled means the new gated function; SPA HTML at an API URL means incorrect domain routing.

On 23 September the connected Supabase control-plane account still rejects access to the hosted project. Lovable credits have been replenished and the gated schema/function deployment was completed through Lovable; its read/query functions work. Deploy and verify the pilot code before configuring pilot users. Cloudflare routing is deployed and verified; git synchronization alone does not establish a backend deployment.

Gateway changes were merged in PR #77 at `bb5c0d474a588af531a67bdf8d1c0e67c4935f80`. The live gateway passes all eight routing checks and public federation discovery for `jonatan_tensetti@nolto.social`. Regression coverage includes route coverage, split-domain redirects, signed inbox bytes through the proxy, website-origin consent and one-time browser returns. These checks do not establish signed exchange with another server or hosted native-client compatibility.

## AT Protocol is a separate deliverable

Bluesky sign-in proves an existing AT Protocol identity to Nolto. It does not create an AT Protocol repository for a Nolto handle, authorize cross-posting or synchronize all likes/replies. The requested per-user accounts, such as `name.nolto.social`, require a real PDS, repository provisioning and verified handle ownership. No PDS is deployed: the operator's budget is zero and paid hosting is out of scope. `ATPROTO_DID` remains unset; the optional single apex-handle verification route is not per-user provisioning. A bridge needs explicit opt-in, permissions, record mappings, deduplication, deletion and retries. Bridgy Fed can bridge opted-in public accounts; bridged accounts cannot be used for native login or merge two existing identities. No bridge is deployed by this change.

References: [Mastodon apps API](https://docs.joinmastodon.org/methods/apps/), [OAuth API](https://docs.joinmastodon.org/methods/oauth/), [client authorization](https://docs.joinmastodon.org/client/authorized/), [Bridgy Fed](https://fed.brid.gy/docs).
