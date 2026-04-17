# Federation Pre-Launch Checklist

A pragmatic checklist to verify Samverkan is fully Fediverse-ready before
opening signups in production.

## 1. DNS & Domain

- [ ] `samverkan.se` resolves to the Lovable/Vercel deployment
- [ ] `www.samverkan.se` resolves to the same origin (or 301 redirects to apex)
- [ ] HTTPS valid certificate covering both apex and `www`
- [ ] `SITE_URL` secret is set to `https://samverkan.se`

## 2. Discovery Endpoints (must return 200 publicly)

```
curl -sI https://samverkan.se/.well-known/webfinger?resource=acct:test@samverkan.se
curl -sI https://samverkan.se/.well-known/nodeinfo
curl -sI https://samverkan.se/.well-known/host-meta
curl -sI https://samverkan.se/.well-known/oauth-authorization-server
curl -sI https://samverkan.se/nodeinfo/2.0
```

All should return `200 OK` with appropriate `Content-Type`.

## 3. Actor Object

```
curl -H "Accept: application/activity+json" https://samverkan.se/functions/v1/actor/<username>
```

Verify the response includes:
- [ ] `id` is `https://samverkan.se/functions/v1/actor/<username>` (NOT supabase.co)
- [ ] `inbox`, `outbox`, `followers`, `following` are all `samverkan.se` URLs
- [ ] `publicKey.publicKeyPem` contains a valid PEM
- [ ] `endpoints.sharedInbox` is `https://samverkan.se/functions/v1/inbox`

## 4. WebFinger Round-Trip

From an external Mastodon instance, search for `@<username>@samverkan.se`.
The profile should resolve and be followable.

## 5. Federation Smoke Tests

- [ ] Follow a Mastodon account from Samverkan → confirm follower appears
- [ ] Be followed by a Mastodon account → confirm follower stored
- [ ] Post locally → confirm it appears on the Mastodon follower's timeline
- [ ] Receive a like/boost/reply from Mastodon → confirm notification
- [ ] Delete a post → confirm Tombstone propagates

## 6. Security

- [ ] HTTP signature verification is enforced on `/inbox` (rejects unsigned requests)
- [ ] Replay-cache (`federation_signature_cache`) drops duplicate signatures
- [ ] Date header window is enforced (±5 minutes)
- [ ] `manuallyApprovesFollowers` is honored (pending → notification)
- [ ] Blocked actors / blocked domains are rejected at inbox

## 7. Mastodon API Compatibility

Test with a third-party client (Tusky, Elk, Phanpy):
- [ ] `/api/v1/instance` returns valid metadata
- [ ] `/api/v1/apps` registers an OAuth client
- [ ] OAuth flow completes via `/.well-known/oauth-authorization-server`
- [ ] `/api/v2/search` returns local accounts and hashtags

## 8. Migration Tools

- [ ] CSV import (Mastodon-format follows) works in Settings → Migration
- [ ] Account move (`Move` activity) auto-re-follows on the new account
- [ ] Data export (JSON + ActivityPub ZIP) downloads successfully

## 9. Observability

- [ ] Federation queue stats visible in admin dashboard
- [ ] Rate-limited hosts surfaced in admin dashboard
- [ ] Federation alerts (`federation_alerts` table) are reviewed weekly
- [ ] Dead-letter queue (failed deliveries with `attempts >= max_attempts`) drained

## 10. SEO / Crawl Hygiene

- [ ] `robots.txt` blocks `/functions/` and `/api/`
- [ ] Actor and WebFinger endpoints have `Cache-Control: public, max-age=300`
- [ ] No `noindex` on the public profile pages

## 11. Rollback Plan

If federation breaks in production:
1. Disable signups (Cloud → Auth settings)
2. Pause `federation-coordinator` cron
3. Inspect `federation_alerts` and `federation_request_logs`
4. Roll back the offending deployment
