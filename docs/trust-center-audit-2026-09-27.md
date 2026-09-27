# Nolto security review — 27 September 2026

Public summary: https://nolto.social/trust-center

This is an internal, assisted code and configuration review, not an independent penetration test, compliance certification, exhaustive vulnerability assessment or live status service. Baseline source: `e2a26fcf637a19af8c550411c4a6dc50222bbeed`. No production user content was changed during testing. We inspected schema metadata and aggregate/readability checks, with write-rejection tests in an isolated database. No conclusion about past exploitation is established by this review.

## Scope and results

| Check | Evidence on 27 September | Limit |
| --- | --- | --- |
| Exposed database tables | 99 public-schema tables, including partitioned tables, all with RLS enabled | Policy correctness cannot be inferred from RLS flags alone |
| Storage | 8 buckets; none public | Media gateway authorization remains a separate boundary |
| Views | 13 public views; no INSERT/UPDATE/DELETE or column write privileges for anon/authenticated after remediation | Service role and view owner remain privileged |
| Private key/session tables | Browser SELECT and write grants absent on `actors`, `server_keys`, `federated_sessions` | Not a complete privileged-function review or historical incident investigation |
| Dependencies | `npm audit` found 0 known advisories in the locked web dependency graph | Dated advisory data, not proof of safe implementations; separate mobile/Worker dependency trees are outside this result |
| Public transport | Homepage HTTPS response includes HSTS, nosniff and strict-origin-when-cross-origin | Current certificate chain/expiry and all routes were not exhaustively audited |
| Worker cookie boundary | Public WebFinger and OAuth discovery returned HTTP 200 and no Set-Cookie header | Read-only endpoint sampling, not source attestation of the deployed Worker or authenticated login acceptance |

The Supabase advisor connector returned `INVALID_ARGUMENT` for this Lovable-managed backend. The review therefore uses the explicit catalog and role checks above; it does not claim a clean provider-advisor report.

The private projection views deliberately use owner permissions to expose a restricted column set while the base profile table is private. They are not blindly changed to invoker security, which would break public profile discovery. Their explicit write grants were the problem, and their visibility predicates now also have a security barrier.

## TC-01 — High — fixed and verified in production

Public profile and CV projections had unintended INSERT/UPDATE/DELETE permissions for browser roles. Automatically updatable owner-executed views can bypass the base table's row and column write boundaries. The existence of RLS on the base table was therefore insufficient.

Migration `20260927054851_public_view_write_boundaries.sql` revokes table-level and column-level write privileges from PUBLIC, anon and authenticated on all public views, preserving existing SELECT and service access. The three owner-executed projections receive `security_barrier=true`. Ordinary profile/CV editing still uses the protected base tables and RPCs.

The exact migration was applied transactionally and recorded in the hosted migration ledger on 27 September. Post-change catalog queries confirmed **13 views, zero browser-writable views**, three security barriers, readable public projections, and unchanged legitimate profile/CV edit grants. Isolated tests execute INSERT, UPDATE and DELETE as both anonymous and authenticated roles and expect SQLSTATE 42501. The full privacy regression also runs with the new migration.

This review does not establish whether the previous permissions were used. Log retention, historic access and incident impact require a separate investigation. No assertion of “no breach” is made.

## TC-02 — Low — fixed and verified in production

The original public backend image response set `__cf_bm` with `Domain=supabase.co`, `SameSite=None` and `Secure`. That Domain matches the backend response host; this finding concerns cross-origin image credentials, not proof of an invalid cookie Domain.

The shared `PublicImage` boundary now applies anonymous CORS to the exact configured backend origin and known public-media/proxy-media paths. It covers company images, posts, quoted posts, events, previews, lightboxes and federation content. `AvatarImage` and the pinned Radix avatar preload apply the same boundary. Sanitized article HTML is prepared in an inert fragment so known backend images have `crossorigin=anonymous` before insertion into the page. Authenticated private media previews retain their existing access checks. Unrelated providers, relative URLs and blobs retain their existing behavior.

URL-boundary, real avatar-preload and article-sanitization tests pass. The published `/feed` was checked in the browser: the backend avatar had `crossorigin=anonymous`, finished loading with a nonzero natural width and produced no warning/error console entries. The published application bundle contains the new transport and media implementation. This fix does not change unrelated external image providers' cookie policies.

## TC-03 — Low — fixed and verified in production

On the managed production site, the active Supabase client now sends its native WebSocket transport to `wss://nolto.social/realtime/v1/websocket`, preserving the SDK's query parameters, subprotocols and socket lifecycle. Preview and self-hosted installations retain their configured transport. The Cloudflare gateway proxies only this exact realtime endpoint to the configured HTTPS backend. It removes inbound cookies and upstream `Set-Cookie` while preserving upstream authentication and authorization. Browser Origins must match Nolto. Website and managed-login cookies are unchanged.

Live read-only checks at **2026-09-27 07:53:51 UTC** established:

- A successful HTTP **101** upgrade on the Nolto endpoint with **no Set-Cookie**.
- An isolated, ephemeral public channel subscription, heartbeat and leave all acknowledged with `ok`; no messages were published and no private/user-data channels were queried.
- An invalid API key rejected with **401**, and a foreign browser Origin rejected with **403**.

Unit tests exercise URL confinement, cookie isolation and upstream rejections. A real Workers runtime test verifies HTTP 101, bidirectional frames and close forwarding. This closes the provider-cookie boundary by moving the production browser socket behind Nolto's gateway. The original authenticated Firefox session and its precise warning were not reproduced, and this is not a claim of testing every authenticated subscription flow. Bot protection was not disabled.

## TC-04 — Medium — fixed and verified in production

The existing `nolto-federation` Worker now covers `nolto.social/*`, including HTML responses from the existing Lovable origin. It adds an **enforcing Content-Security-Policy**, **X-Frame-Options: DENY**, nosniff and a strict-origin-when-cross-origin referrer policy. The CSP forbids framing, objects and base elements; restricts scripts to the site, named Cloudflare resources and the exact tested theme-bootstrap hash; and limits connections to configured services. The Nolto WebSocket origin is explicitly included for browsers that do not interpret `connect-src 'self'` as covering WebSockets.

Inline styles remain permitted for the UI. HTTPS images, media and frames remain available for federated media and user-selected meeting/video providers. These compatibility allowances are intentional; inline/eval scripts are not enabled. Existing origin CSPs are retained, streamed bodies are preserved, and ordinary login cookies are not stripped.

Live GET responses for `/`, `/trust-center`, `/auth`, `/feed` and `/integrations` returned **200**, an enforcing CSP with `frame-ancestors 'none'`, and `X-Frame-Options: DENY`. The published feed and its public backend avatar loaded successfully under that policy with no captured warning/error console entries. Regression tests verify managed-login cookie preservation and the actual theme bootstrap hash. The actual CSP response headers, rather than a repository-only hosting file, are the closure evidence.

## Remediation and deployment record

All four findings **TC-01 through TC-04 are closed** for this dated review. The public center shows an empty open-findings list and retains the four resolved findings as expandable history. The operational limits below remain visible and are not represented as verified controls.

- [PR #88](https://github.com/Jtensetti/fediverse-career-nexus/pull/88), merged as `8e52742773d2569d696307f0998d8c1927c1896b`, contains the media, realtime and response-policy fixes.
- Cloudflare Worker version `802c92d1` introduced the deployed fixes; follow-up version `3ae3d3da` explicitly permits the configured site's secure WebSocket origin. The live `nolto.social/*` route is active; the prior narrower routes point to the same Worker.
- Lovable production deployment of the merged frontend was verified against the live application asset `/assets/index-vXqNhAeN.js` at **07:58 UTC**, followed by browser media checks. The subsequent Trust Center update retains these fixes.
- Validation for the remediation: **139 Node tests**, **72 Deno tests**, source/type/edge checks, production build, both Worker dry runs and the real Workers WebSocket test passed. Locked web and Worker dependency audits returned zero advisories.
- [GitHub Actions run 36304139964](https://github.com/Jtensetti/fediverse-career-nexus/actions/runs/36304139964) passed validation, fresh-install database replay, container and mobile jobs. Live federation and gateway checks passed.

## Operational limits carried forward

These are outstanding evidence gaps from existing project documentation, not newly proven vulnerabilities:

- Restore the backup in an isolated environment, verify deletion handling after restore, and document provider backup/log expiry.
- Confirm alert delivery, ownership and rate-limit coverage. A successful HTTP response is not evidence of load resilience.
- Review the retained federation signing identity after the previously documented key-access issue.
- New local private messages have browser-side encryption/signatures, but no forward secrecy, rotation workflow or independent cryptographic review. Participant metadata remains visible.
- Deletion hides requested records and schedules permanent erasure after 30 days. Remote federated copies and provider backups need separate handling.
- This review did not complete authenticated browser acceptance for every account, MFA, messaging, export and deletion journey.

## Reproducible checks

```sh
npm ci
npm run check:source
npm run check:types
npm test
npm audit
npm run build
npm --prefix deploy ci
npm --prefix deploy run check
node scripts/test-support/run-privacy.mjs /path/to/@electric-sql/pglite/dist/index.js
```

The repository's existing `fresh-install` and real Supabase CI jobs replay new migrations in a disposable environment. The new view-permission assertions are also included in the fresh-install safety assertions. Production was never used as a write-test fixture.

## Authoritative references

- [PostgreSQL CREATE VIEW: owner permissions, automatically updatable views and security barriers](https://www.postgresql.org/docs/17/sql-createview.html)
- [Supabase row-level security and views](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Cloudflare cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/)
- [Cloudflare Bot Fight Mode limitations](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)
- [MDN connect-src and WebSocket browser compatibility](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/connect-src)
- [MDN image crossorigin behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)

Report vulnerabilities privately to jtensetti@protonmail.com. No response-time guarantee or paid bounty is offered. `/.well-known/security.txt` provides the contact in machine-readable form.
