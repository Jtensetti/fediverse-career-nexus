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

## TC-02 — Low — mitigated in selected image components

A public avatar was observed loading directly from the configured Supabase origin. Its response sets `__cf_bm` with `Domain=supabase.co`, `SameSite=None` and `Secure`, and includes `Access-Control-Allow-Origin: *`. That Domain matches the response host. The Nolto social image sets `Domain=nolto.social`, which also matches its response host.

`AvatarImage` and `MediaImage` now use anonymous CORS image requests for the exact configured backend origin and the known public-media/proxy-media paths. Unrelated external hosts, relative URLs, blobs, auth endpoints and hostname lookalikes retain ordinary image behavior. This avoids cross-origin credentials in those image requests without breaking remote images that do not support CORS.

The previously pinned avatar component (1.1.2) created a separate preloading Image without the crossOrigin attribute. It is updated to the exact version 1.2.6, whose preload applies crossOrigin before assigning src. Regression tests cover the URL boundary and the actual preload behavior. This does not remove provider-generated cookies, suppress console logging, disable bot protection or cover every image in the application.

## TC-03 — Low — reported WebSocket warning remains open

The user's reported Firefox warning has not been reproduced for the authenticated realtime handshake. The active frontend client uses the configured Supabase backend; the checked Worker only proxies the listed federation/native-client endpoints. The source does not proxy Supabase Realtime.

Today's merged Worker change (`1abf4b3`, merged by `e2a26fc`) removes inbound Cookie and upstream Set-Cookie on those protocol routes while retaining Authorization, Signature, Digest, streamed bodies and response status. Unmatched website and managed-login requests preserve their own cookies. Existing regression tests exercise both route/split modes. Live WebFinger and OAuth-discovery samples agree with this boundary: neither forwarded an upstream cookie.

A request to another origin does **not** by itself make a cookie Domain invalid. Cookie-domain validity is checked against the response host. Third-party-cookie restrictions are a separate browser decision. Cloudflare does not add __cf_bm unconditionally to every response. Regular Bot Fight Mode cannot be skipped by WAF Skip rules; Super Bot Fight Mode is different.

To close: capture the actual WebSocket URL, status, Set-Cookie **attributes with values redacted**, and a paired successful/failed subscription in the affected browser. Determine which provider owns the response before changing configuration. Do not remove all cookies from authentication routes or disable bot protection globally. A rule on the nolto.social zone cannot alter a direct response from a provider's supabase.co zone.

## TC-04 — Medium — response hardening remains open

The checked homepage response includes HSTS, nosniff and a referrer policy, but no Content-Security-Policy or X-Frame-Options. `vercel.json` and the self-hosted Caddy configuration do not establish what Lovable serves. A repository-only `_headers` file or a CSP meta tag cannot be treated as proof that frame-ancestors is enforced.

Next: configure anti-framing and a staged CSP at the serving layer, inventory real script/connect/frame dependencies, exercise managed login, media, encrypted messages and embedded profile consent, then verify the actual headers. The available connected tools did not expose Cloudflare zone rules or Worker deployment management; this review did not change the zone's bot/WAF settings. The existing Worker routes do not intercept normal homepage responses, so adding headers only there would not close this finding.

## Operational limits carried forward

These are outstanding evidence gaps from existing project documentation, not newly proven vulnerabilities:

- Restore the backup in an isolated environment, verify deletion handling after restore, and document provider backup/log expiry.
- Confirm alert delivery, ownership and rate-limit coverage. A successful HTTP response is not evidence of load resilience.
- Review the retained federation signing identity after the previously documented key-access issue.
- New local private messages have browser-side encryption/signatures, but no forward secrecy, rotation workflow or independent cryptographic review. Participant metadata remains visible.
- Deletion hides requested records and schedules permanent erasure after 30 days. Remote federated copies and provider backups need separate handling.
- This turn did not complete authenticated browser acceptance for every account, MFA, messaging, export and deletion journey.

## Reproducible checks

```sh
npm ci
npm run check:source
npm run check:types
npm test
npm audit
npm run build
node scripts/test-support/run-privacy.mjs /path/to/@electric-sql/pglite/dist/index.js
```

The repository's existing `fresh-install` and real Supabase CI jobs replay new migrations in a disposable environment. The new view-permission assertions are also included in the fresh-install safety assertions. Production was never used as a write-test fixture.

## Authoritative references

- [PostgreSQL CREATE VIEW: owner permissions, automatically updatable views and security barriers](https://www.postgresql.org/docs/17/sql-createview.html)
- [Supabase row-level security and views](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Cloudflare cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/)
- [Cloudflare Bot Fight Mode limitations](https://developers.cloudflare.com/bots/get-started/bot-fight-mode/)
- [MDN image crossorigin behavior](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin)

Report vulnerabilities privately to jtensetti@protonmail.com. No response-time guarantee or paid bounty is offered. `/.well-known/security.txt` provides the contact in machine-readable form.
