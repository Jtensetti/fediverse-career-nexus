# Privacy, encrypted messages and deletion

Implementation candidate, 22 September 2026. Nothing in this document asserts that the Cloud database, Storage policies, functions, scheduler or frontend have been deployed. Apply this with the production-readiness runbook.

## What is protected

| Data | Protection and remaining visibility |
| --- | --- |
| New local private message text | OpenPGP encryption and sender signature in the browser, encrypted to both participants. The API receives ciphertext only. |
| Inbox private key | Encrypted under a separate user key phrase before upload. Decrypted only in browser memory. Never send the phrase to support. |
| Message relationships | Sender, recipient, timestamps, job conversation ID and key fingerprints remain server-readable. |
| Existing private messages | Existing server-side AES-GCM remains readable by the server, with an explicit legacy label. No silent claim of retroactive E2EE. |
| Public profile, posts, articles and images | Readable for publication and federation. These cannot be E2EE while providing the current public service. |
| Retained content snapshots | AES-256-GCM under `RETENTION_ENCRYPTION_KEY`, purpose-separated by HKDF. This protects a database-only disclosure, not an attacker who also obtains the runtime key. |
| Retained files | Immediately hidden through the gateway and Storage policies, then asynchronously encrypted and moved to the private `retained-deletions` bucket. AAD binds each file to its deletion request/object path. |
| Authentication, CV data and moderation records | Access controls and provider storage protections apply; these are not claimed to be application-level E2EE. Account deletion makes them inaccessible to ordinary sessions and removes related records at final purge. |

Nolto does not sell personal data. That choice does not remove its controller responsibilities. Provider backups, technical access logs and federated recipients need their own verified retention and transfer arrangements.

## Inbox behavior and limits

The pinned, lazy-loaded dependency is `openpgp@6.3.1`, using its WebCrypto-backed NIST P-256 support, signed messages and authenticated encryption. The signed payload binds the message ID, participants, key fingerprints and optional job conversation; ciphertext copied into another conversation is rejected. The server checks recipient key IDs, and PostgreSQL rejects new plaintext sends even through a privileged insert. Browser caches are cleared on locking/sign-out; no decrypted inbox persistence is added. A phrase of at least 16 characters is required; the UI recommends five random words and a saved encrypted backup.

Both parties must activate an inbox before sending. On a new device, the user downloads their own encrypted key backup from the backend and unlocks locally with the same phrase. A downloaded JSON backup can also unlock locally after verifying its registered public key. A login password reset cannot recover the inbox phrase. Registration is immutable: there is no key reset or rotation workflow in this candidate. Lost phrases make those messages unreadable and prevent use of that key. Do not deploy a support shortcut that silently replaces a key.

Fingerprints are pinned per local account/peer in browser storage. A changed fingerprint fails closed; users can compare fingerprints through another trusted channel. This is trust on first use, not independently verified identity. Clearing browser storage removes prior pins. This design has **no forward secrecy**: compromise of a private key can expose retained ciphertext. A compromised browser, extension, device or JavaScript served by a compromised host can steal plaintext while it is used. This integration has not received an independent cryptographic review. Do not market it as equivalent to Signal or as eliminating breach risk. [OpenPGP.js documentation](https://docs.openpgpjs.org/) describes the underlying library; its prior reviews are not a review of Nolto's integration.

Exports preserve new message ciphertext and signed metadata. Users should separately save their key backup. Existing server-encrypted messages retain the previous readable export behavior. Remote Mastodon DMs are not implemented.

## Deletion lifecycle

1. `request-deletion` authenticates ownership, permitted company role or moderation role. `delete-account` additionally requires a recent verified login and organisation/file transfer preflight.
2. The service encrypts the snapshot. A database transaction locks and version-checks the row, records `requested_at` / `purge_after`, marks it deleted and scrubs the body. Accounts are immediately excluded from session validation, public views, discovery, suggestions and restrictive row policies. Auth banning is an additional retried boundary.
3. Attached media is recorded in `deletion_media`. Public buckets become private. Clients cannot read Storage directly or mint long-lived signed URLs. `public-media` checks an active owner and an active publication; another user's link cannot publish a private upload. Authenticated owner previews use a header-bearing request and blob URL, never a JWT in markup. Gateway responses are `no-store`. Cached/downloaded copies from before the cutover cannot be recalled.
4. Public content deletion queues a minimal ActivityPub Delete immediately; account deletion queues an actor Delete while retaining its signing identity for delivery. Old queued content snapshots are removed. The federation worker rechecks current content and queue existence, uses paginated follower reads and success receipts. Requests already in flight and recipients' existing copies cannot be recalled. Actual remote acceptance remains a Mastodon integration gate.
5. `privacy-maintenance` first processes due purges, then account content snapshots, pending file archives and expired technical records. Media removal makes bounded progress across invocations, with the manifest entry removed only after both original and archive deletion succeed. Auth deletion uses its API, followed by retained archive/request cleanup. A crash after Auth deletion is retryable. Failed items back off for five minutes and batches rotate so one failing file/account does not starve the rest. A global two-minute lease, per-call timeouts, bounded batches and a 40-second work budget prevent archive/purge overlap under normal execution. Database claims recover abandoned request leases after ten minutes.
6. Ordinary deletion is due after 30 days. Physical completion depends on the worker and provider availability: missed schedules or persistent failures must alert the operator. No normal user API restores retained data. Permanent erasure removes the archive as well. Minimal retired handles/object tombstones remain to prevent identity takeover and serve deletion semantics.

Account content archived later inherits the account's earlier purge deadline. Deletion does not need an active browser session. Organisation ownership and shared organisation files must be transferred before account closure. Oversized historical files above 25 MiB need assisted archival; they remain hidden and are still removable at purge. Replaced company images are queued through the same 30-day path once no publication references them. New uploads are limited to 10 MiB and supported raster image MIME types. The media gateway checks the metadata size before loading bytes.

## Data minimisation

Profile visit tracking, its history and the dashboard/settings UI are removed. New message requests contain no intro text or preview. Consent and MFA recovery records reject IP/user-agent values. New accounts default to no digest email; the worker requires an active account and explicit `email_digest_enabled=true`. Existing preferences are preserved.

The shared logger records an allowlist of numeric/boolean operational metrics, not arbitrary objects or raw errors. Duplicate request loggers now use it; noisy actor/user/content debug statements were removed from federation handlers. This is not a promise that provider logs contain no IP addresses. Database authentication rate-limit logs are pruned after one day, federation request logs after seven days, MFA recovery requests after 30 days and expired short-lived tokens are removed. Review remaining moderation/provider retention under real traffic.

## Coordinated rollout

1. Verify a restorable backup and a staging Cloud environment with actual Auth, Storage and PostgREST. Rehearse the two 21 September security migrations first, then `20260922041529_nolto_private_messages_and_minimisation.sql` and `20260922041921_nolto_deletion_retention.sql`. The local PostgreSQL fixtures contain schema and synthetic test records only. Do not apply them to Cloud.
2. Provision a **new independent random** `RETENTION_ENCRYPTION_KEY` of at least 32 characters through server secret storage. Preserve the existing token/message encryption secret. Back up secrets separately from database/files with restricted access. No secret has been generated or installed by this change.
3. Use a maintenance window. Apply the migrations, deploy all matching functions and frontend together. The four new functions are `message-keys`, `request-deletion`, `public-media` and `privacy-maintenance`; existing messaging, deletion, federation, digest, export and logging handlers change too. Confirm function gateway settings and that obsolete deployed handlers remain retired. Old clients cannot send plaintext or hard-delete retained content after cutover.
4. The media migration rewrites known Cloud Storage URLs in profiles, companies, posts, articles, events and starter packs. Audit any historical URLs on other origins or unusual encodings and old signed/CDN URLs before publication. Test owner draft covers, inline editor images, recropping, avatars and company images. The gateway adds database/Storage work per image; measure latency, throughput and provider costs. Do not add a shared cache that bypasses deletion checks.
5. Schedule a service-authenticated POST to `privacy-maintenance` every minute using secrets from the scheduler's vault. Do not put the service-role key in browser code, a public repository or a plain-text cron command. Enable the independent federation scheduler too. Alert on failed invocations, `failed > 0`, the oldest overdue request and oldest file awaiting archival. Increasing backlog requires more capacity, not extending the advertised retention period.
6. Test two accounts: key creation and backup, cross-device unlock, wrong phrase, changed fingerprint, send/read after reload, idle lock, sign-out, job messages and ciphertext export. Test all delete buttons, stale sessions, direct APIs, original/gateway/signed image URLs, blocked organisation transfer, two simultaneous workers, partial Storage errors and crash/retry after Auth deletion. Advance only a staging request deadline to rehearse the purge. Confirm that all personal rows/files/archives and both sides of a local conversation are erased.
7. Complete security review, a real Mastodon Delete round trip, provider backup/restore retention verification, operator contacts and the legal review before publishing the new notice. GitHub CI cannot establish these Cloud behaviors.

Monitor using service-only counts/timestamps, not message or snapshot content:

```sql
SELECT kind,count(*) AS pending,min(purge_after) AS oldest_due
FROM public.deletion_requests WHERE purge_after<=now() GROUP BY kind;
SELECT count(*) AS files_waiting FROM public.deletion_media WHERE NOT source_removed;
SELECT count(*) AS auth_bans_waiting FROM public.deletion_requests WHERE kind='account' AND NOT auth_banned;
```

The normal 30-day schedule is not an automatic legal right to postpone erasure. Review rights requests promptly; use an authorised, documented case procedure to advance the identified request's deadline if required. After identity and scope verification, the service role can update just that request's `purge_after` to `now()` and run the same purge worker. For an account, the worker also erases its associated content archives. Never publish archive payloads in a support ticket. [IMY's erasure guidance](https://www.imy.se/privatperson/dataskydd/dina-rattigheter/radering/) explains rights and response deadlines; a controller must assess the actual request and exceptions.

Restoring a pre-deletion provider backup can resurrect data. Keep an access-restricted deletion manifest for the lifetime of any backup capable of restoring it, and reapply outstanding/completed erasures before reopening a restored environment. This operational procedure and the provider's actual backup expiry have **not** been verified. Do not claim deletion from every backup or remote server.
