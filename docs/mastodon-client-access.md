# Mastodon client access

This is an opt-in, experimental subset of the Mastodon client API. It is **not deployed or enabled on nolto.social**. The implementation is gated by MASTODON_CLIENT_ENABLED=true; missing/false returns 503 before reading the database. Do not enable it until backend deployment, canonical-domain routes and a real client have passed acceptance checks.

Users select nolto.social as their server, sign in on Nolto with their existing method, then explicitly approve the app. Google, Apple, Bluesky and password sign-ins authorize the same local identity. Browser consent is at /oauth/authorize; /settings/apps lists and revokes app access and is linked from profile privacy settings. /mastodon-apps describes the limits.

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

1. Apply migration 20260922184945_mastodon_client_access.sql once; record its canonical version instead of generating a second executable copy.
2. Deploy mastodon-api, oauth-authorization-server and privacy-maintenance with all shared dependencies. The two public endpoints retain verify_jwt=false because their bodies implement scoped opaque-token authorization. Leave MASTODON_CLIENT_ENABLED unset.
3. Publish consent, connected-apps and guide pages. Keep SITE_URL on the canonical browser HTTPS origin and FEDERATION_DOMAIN on the permanent federation domain.
4. Install canonical-domain proxy routes. Cloudflare Worker, Caddy, Netlify and Vercel examples forward /api/v1/*, /api/v2/*, /oauth/token, /oauth/revoke and discovery. /oauth/authorize, /~oauth/* and browser callbacks stay on the website. Lovable hosting does not apply these repository configurations automatically. Current One.com nameservers do not themselves install a Cloudflare Worker; a suitable proxied zone/domain configuration and administrator access are needed.
5. Enable MASTODON_CLIENT_ENABLED=true in an isolated staging deployment and run:

       node scripts/check-mastodon.mjs https://staging.example.com

6. With a consenting test user and the intended native app, test registration → sign-in/MFA → explicit consent → callback → token → verify credentials → feeds → public post/reply/favourite/unfavourite/follow/unfollow. Check code replay, scopes, unsupported private posts, moderation and revocation. API-shaped responses alone do not prove native app compatibility.
7. Verify federation separately:

       node scripts/check-federation.mjs username@staging.example.com

   Exercise signed Follow/Accept/Note/reply/Like/Undo with a real peer.
8. Enable production only after these checks and update the guide's activation status. HTTP 410 means the old stub; HTTP 503 saying access is not enabled means the new gated function; SPA HTML at an API URL means incorrect domain routing.

The connected Supabase account currently rejects access to the hosted project. The previous Lovable agent deployment was blocked by exhausted credits; the workspace-details tool does not expose a current balance. Domain/proxy administration is also unavailable in the connected tools. GitHub commits do not resolve these deployment dependencies.

The local implementation passed 28 Node tests, 43 Deno tests, TypeScript/Edge checks, a production build and all three isolated SQL suites before the workspace disconnected. The changes were recovered through GitHub afterward. The current GitHub commit must pass the repository's CI as its own acceptance check; the older local results are not a substitute.

## AT Protocol is a separate deliverable

Bluesky sign-in proves an existing AT Protocol identity to Nolto. It does not create an AT Protocol repository for a Nolto handle, authorize cross-posting or synchronize all likes/replies. Native Bluesky identity requires PDS/repository and handle provisioning. A bridge needs explicit opt-in, permissions, record mappings, deduplication, deletion and retries. Bridgy Fed can bridge opted-in public accounts; bridged accounts cannot be used for native login or merge two existing identities. No PDS or bridge is deployed by this change.

References: [Mastodon apps API](https://docs.joinmastodon.org/methods/apps/), [OAuth API](https://docs.joinmastodon.org/methods/oauth/), [client authorization](https://docs.joinmastodon.org/client/authorized/), [Bridgy Fed](https://fed.brid.gy/docs).
