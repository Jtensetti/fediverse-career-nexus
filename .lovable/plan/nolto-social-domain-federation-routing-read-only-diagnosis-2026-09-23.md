# nolto.social domain & federation routing — read-only diagnosis

## Current domain connection (verified live)

| Setting | Value |
| --- | --- |
| Status | **Active**, primary domain, connected ~1 day |
| Connection mode | Standard connect (A-record based), TXT-token verification: **verified** |
| DNS authority | External — nameservers `ns01.one.com`, `ns02.one.com` (One.com) |
| "Uses Cloudflare or similar proxy" | **Not in effect.** `nolto.social` and `www` resolve directly to `185.158.133.1` (Lovable's IP), not through a proxy edge; DNS is on One.com, not Cloudflare |
| Expected DNS records | TXT `_lovable` (proof token, present and matching — value withheld) and A `@` → `185.158.133.1`; both **ok** |
| Other connected domains | `www.nolto.social`, `nolto.tensetti.io` (both also point at Lovable) |
| Published lovable.app origin | `https://fediverse-career-newest.lovable.app` |

## Why federation paths fail

Live probes (read-only): `/.well-known/webfinger` → **404 text/plain**, `/api/v1/instance` → **200 text/html (SPA fallback)**, `/host-meta` → 200 XML. Only `/host-meta` reaches the federation layer; everything else falls through to the static SPA. Lovable's hosting applies no rewrite/proxy rules, so `public/_redirects`, `vercel.json` and `Caddyfile` are inert — routing must happen in front of the domain.

## Why the previous Cloudflare Worker did not work

`deploy/nolto-gateway.mjs` installs as a **Cloudflare Worker Route**, which only exists on a **Cloudflare-managed, proxied zone**. nolto.social's DNS is delegated to One.com and is not proxied — so the Worker Route never intercepts any traffic. That is the blocker, not the Worker code.

## Can proxy mode be enabled without disconnecting?

Official docs describe proxy mode (CNAME-based verification) as an option in the **Connect Domain** flow ("Uses Cloudflare or similar proxy"). Neither the docs nor the tooling available here confirms a supported way to flip an **already-connected** domain from A-record mode to proxy mode in place. The domain is currently Active and serving correctly as a website, so any change should be made deliberately:

- **Option A — check the Domains UI first (no code):** Project Settings → Domains → nolto.social → Advanced. If the proxy toggle is offered on the connected domain, enabling it switches verification to a CNAME pointing at the lovable.app origin without removing the domain.
- **Option B — reconnect with proxy mode:** remove and re-add nolto.social with the proxy option checked. Ownership proof is the same `_lovable` TXT token already present in One.com DNS, so re-verification is expected to be quick — but the site is briefly unconnected during the swap.
- **Either way**, proxy mode requires the zone to actually pass through Cloudflare (or a similar proxy): nameservers must move to Cloudflare (change at One.com) and then the Worker Route from `deploy/nolto-gateway.mjs` is deployed on that zone to intercept `/.well-known/*` and `/functions/v1/*`.

## Recommended sequence (for a later, non-read-only session)

1. Move nolto.social's nameservers from One.com to Cloudflare (or use One.com's own forwarding if it supports path-based proxying — it does not support Worker Routes).
2. Re-verify/reconnect the domain in proxy mode (CNAME) per docs.
3. Deploy the Worker Route (`npx wrangler deploy --config deploy/wrangler.toml`) on the Cloudflare zone.
4. Re-run the launch probes: WebFinger JRD JSON, `/api/v1/instance` JSON, actor/inbox ActivityPub JSON, then `scripts/check-federation.mjs`.

No changes were made: no files, DNS, secrets, migrations or deployments touched.
