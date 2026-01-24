
## Goal
Make `https://nolto.social/.well-known/webfinger?...` (and the published `*.lovable.app` domain) stop returning a plain `Not found` and reliably reach the backend WebFinger handler so Fediverse discovery works.

## What I found (root cause)
- The backend **WebFinger function works** (calling `/webfinger` on the backend returns the expected `"Resource parameter is required"` error, which proves the function exists and is reachable).
- But requests to `/.well-known/webfinger` on both:
  - `nolto.social`
  - `fediverse-career.lovable.app`
  currently return a **plain `Not found`**, and there are **no backend logs for `webfinger`** during those calls.
- That means the request is **not being routed/proxied** from the website domain to the backend function.  
- We already have a `vercel.json` rewrite configured, but it is **not being applied** in the current hosting setup.

## Implementation approach (what we’ll change)
### 1) Add a hosting-compatible rewrite/redirect configuration
Because `vercel.json` rewrites are not taking effect, we’ll add a second routing mechanism that works on Lovable-hosted deployments.

I will:
- Create `public/_redirects` (Netlify/Pages-style) to rewrite:
  - `/.well-known/webfinger` → `/functions/v1/webfinger` (preferred: same host)
  - `/.well-known/nodeinfo` → `/functions/v1/nodeinfo`
  - `/.well-known/host-meta` → `/functions/v1/host-meta`
  - `/nodeinfo/*` → `/functions/v1/nodeinfo/*`
  - (Optional safety) `/functions/v1/*` → backend function gateway if the platform requires it

Why this works:
- Many static hosts that don’t support `vercel.json` will still honor `_redirects` rules.
- Query strings like `?resource=acct:...` are preserved by rewrite rules, which is required for WebFinger.

### 2) Ensure `/.well-known/host-meta` works even if rewrites are restricted
As a fallback enhancement, I will also add a **static** `public/.well-known/host-meta` file (XML) that points to the WebFinger template:
`https://nolto.social/.well-known/webfinger?resource={uri}`

This does not replace WebFinger, but it increases compatibility with clients that consult host-meta first.

### 3) Verify routing with 3 quick checks (post-change)
After publishing, we’ll verify:
1. `https://fediverse-career.lovable.app/.well-known/webfinger?resource=acct:jrossstocholm@nolto.social` returns JSON with `"subject": "acct:jrossstocholm@nolto.social"`.
2. `https://nolto.social/.well-known/webfinger?resource=acct:jrossstocholm@nolto.social` returns the same.
3. Backend logs show the `webfinger` function receiving the requests (confirming the rewrite is active).

### 4) Fix NodeInfo (currently errors)
My earlier test to the backend `nodeinfo` endpoint returned a 500. Once routing is fixed (so we can hit it via `.well-known/nodeinfo`), we’ll:
- Inspect backend logs for `nodeinfo`
- Patch whatever runtime error it’s throwing (usually a missing env var, an unexpected DB query result, or an unhandled exception)
This is important because some instances rely on NodeInfo during discovery/verification.

## Key risks / gotchas
- If `nolto.social` is not currently pointing to the same deployed site as `fediverse-career.lovable.app`, `nolto.social` will keep returning 404 even after we fix the published domain. In that case, we’ll confirm custom-domain mapping and DNS.
- If the host blocks `/.well-known/*` from rewrites, the static `public/.well-known/host-meta` fallback will still help, but we’ll need a different platform routing mechanism for dynamic WebFinger (I’ll adapt based on what the host supports).

## Deliverables (files we’ll add/update)
- Add: `public/_redirects`
- Add: `public/.well-known/host-meta` (static fallback)
- Keep: `vercel.json` (harmless; useful if export-to-Vercel is ever used)

## After this is done
- WebFinger discovery for `@jrossstocholm@nolto.social` should work from Mastodon search.
- We can then proceed to the “feed works” timeline work with confidence (because federation discovery is foundational).

