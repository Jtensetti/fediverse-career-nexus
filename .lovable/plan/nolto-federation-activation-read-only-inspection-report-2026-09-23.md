# Nolto federation activation — read-only inspection report

Read-only. No code, domain, DNS, secret, account or database changes were made.

## 1. Domains (Project Settings state)

| Domain | Status | Primary | Mode | Notes |
|---|---|---|---|---|
| `nolto.social` | active (1d13h) | **yes** | standard connect (A-record) | verified, serves the app |
| `www.nolto.social` | active | no (redirects to apex) | standard connect | redirects to nolto.social |
| `nolto.tensetti.io` | active | no | standard connect | redirects to nolto.social |

- Project is published; origin `fediverse-career-newest.lovable.app`.
- DNS is on **One.com** (ns01/ns02.one.com); `nolto.social` and `www` both resolve directly to Lovable's IP `185.158.133.1`. **No Cloudflare proxy is in the path.**
- The current connection is A-record + TXT mode. Lovable documents proxy mode ("Uses Cloudflare or similar proxy", CNAME-based) as an option **in the connect flow only**. Neither the docs nor the available tooling confirms an in-place switch for an already-connected domain — no proxy-mode CNAME target is exposed for the existing connection, so there is no CNAME record value to report. The realistic paths are:
  1. Check `Settings → Domains → nolto.social → Advanced` for a proxy toggle (owner action; tooling cannot confirm it exists).
  2. Otherwise remove and re-add the domain with the proxy checkbox — the existing `_lovable` TXT proof is already in One.com DNS, so re-verification should be quick, with a short reconnect gap.
- In same-domain route mode (`deploy/wrangler.toml`), the zone must additionally be delegated to Cloudflare nameservers; One.com must first export/transfer all records including email.

## 2. Live federation routing (public nolto.social)

| Probe | Result |
|---|---|
| `/.well-known/webfinger?resource=acct:…` | **404 text/plain** — not reaching backend |
| `/functions/v1/actor/jonatan_tensetti` | **200 text/html** — SPA fallback, not ActivityPub JSON |
| Backend `webfinger` direct | 200 `application/jrd+json` — correct |
| Backend `actor`, `outbox/<user>` | 200 `application/activity+json` — correct |
| Backend `host-meta`, `nodeinfo` | 200, correct MIME |

Backend is fully functional; the public domain routes only browser traffic. **Blocker unchanged:** nothing in front of nolto.social rewrites protocol paths; `_redirects`/`vercel.json` are inert on this hosting. Requires the Cloudflare Worker (`deploy/nolto-gateway.mjs`) on a proxied zone, or split mode per `docs/nolto-activation.md`.

## 3. Backend readiness (backend anknmcmqljejabxbeohv)

- **ATProto:** readiness GET → `{"ready": true, "siteUrl": "https://nolto.social"}`; `ATPROTO_AUTH_ENABLED` is **on** (bounded bsky.app start previously succeeded).
- **Mastodon gate:** `mastodon-api` and `oauth-authorization-server` deployed with verify_jwt=false; both return **HTTP 503** `{"error":"Mastodon client access is not enabled on this instance"}` — `MASTODON_CLIENT_ENABLED` absent/false, gated before DB access as designed.
- **Functions live:** atproto-auth, inbox, federation, outbox, objects, activities, public-media (path-scoped 404s confirm deployed), privacy-maintenance, webfinger, host-meta, nodeinfo.
- **Migrations:** applied through `20260922182332`, including `20260922172010_federated_interactions` and `20260922172019_post_image_drafts`. **PR #76 mastodon client schema is NOT applied** — no `purge_mastodon_metadata` function, no mastodon metadata tables. Consistent with the plan: gated functions return 503 before touching the DB, and the updated privacy-maintenance must wait for that migration.
- **Schedules (cron):** active — federation-cleanup-hourly, event-scheduler-daily, nolto-privacy-maintenance, nolto-federation-delivery, nolto-atproto-state-cleanup. Inactive — federation-coordinator, scheduled-data-wipe (retired job row only; function deleted).
- **Published site:** `/integrations` and `/share-profile` serve app HTML; entry bundle contains both routes; `/embed/nolto-profile.js` matches the repository file (verified previously).

## 4. Blockers before full federation

1. **Public protocol routing** — the only hard blocker for `@user@nolto.social` discovery. Needs the Cloudflare Worker on a proxied zone (One.com → Cloudflare NS migration + proxy-mode domain connection), or split mode with www as primary. Both require owner DNS/domain actions; see `docs/nolto-activation.md`.
2. **Mastodon client API** — migration + `privacy-maintenance` redeploy + native-client acceptance, then enable flag. Staged and safe at 503.
3. Three open DB access-rule findings (profile_section_visibility, blocked_domains, companies) — awaiting owner authorization for policy changes.

No secrets, tokens, or personal data were accessed or displayed.
