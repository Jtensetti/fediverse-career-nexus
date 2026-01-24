

## Goal
Fix Fediverse discovery for `@user@nolto.social` by resolving three critical issues:
1. Deploy missing edge functions
2. Fix broken edge functions (NodeInfo, Instance)
3. Solve the routing problem for `/.well-known/` paths

## Root Causes Found

### Issue 1: WebFinger function was not deployed
The `webfinger` edge function existed in the codebase but was **not deployed** to Supabase. When I deployed it and tested directly, it works correctly:

```text
Request:  /webfinger?resource=acct:jrossstocholm@nolto.social
Response: 200 OK
{
  "subject": "acct:jrossstocholm@nolto.social",
  "links": [{
    "rel": "self",
    "type": "application/activity+json",
    "href": "https://nolto.social/functions/v1/actor/jrossstocholm"
  }]
}
```

**Status: DEPLOYED AND WORKING**

### Issue 2: NodeInfo and Instance functions crash on startup
Both functions use `Deno.openKv()` which is a **Deno Deploy feature, not available in Supabase Edge Functions**:

```typescript
// Line 11 in nodeinfo/index.ts
const kv = await Deno.openKv();  // TypeError: Deno.openKv is not a function
```

Error from logs:
```text
TypeError: Deno.openKv is not a function
    at file:///var/tmp/sb-compile-edge-runtime/nodeinfo/index.ts:8:23
```

**Fix needed:** Replace Deno KV with in-memory caching (like webfinger uses) or database-based caching.

### Issue 3: Lovable hosting cannot proxy .well-known paths
This is the **critical routing blocker**:
- Lovable hosting is static-only (Vite/React CSR)
- Neither `_redirects` nor `vercel.json` rewrites are supported
- Requests to `nolto.social/.well-known/webfinger` return "Not found" because the static host has no file there and cannot proxy to the backend
- The static `public/.well-known/host-meta` file DOES work (proof that static files are served)

## Implementation Plan

### Step 1: Fix NodeInfo function (remove Deno KV)
Replace the unsupported `Deno.openKv()` with simple in-memory caching:

```typescript
// Before (broken):
const kv = await Deno.openKv();

// After (working):
const memoryCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour
```

Also fix the path handling since the function is called at `/nodeinfo`, not `/.well-known/nodeinfo`.

### Step 2: Fix Instance function (same Deno KV issue)
Apply the same in-memory caching fix.

### Step 3: Add static WebFinger redirect
Since we cannot dynamically proxy WebFinger, create a static HTML file that performs a client-side redirect. While this won't work for Mastodon's server-side lookups, it provides a fallback for browser-based discovery:

```html
<!-- public/.well-known/webfinger/index.html -->
<!DOCTYPE html>
<html>
<head>
  <script>
    const params = new URLSearchParams(window.location.search);
    const resource = params.get('resource');
    if (resource) {
      window.location.href = 
        'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/webfinger?resource=' 
        + encodeURIComponent(resource);
    }
  </script>
</head>
<body>Redirecting to WebFinger...</body>
</html>
```

**Important limitation:** This does NOT solve the Mastodon discovery problem because Mastodon makes server-side HTTP requests, not browser requests.

### Step 4: The real solution - Cloudflare Workers or DNS-level routing
For full federation to work, you need one of these approaches:

**Option A: Cloudflare Worker (recommended)**
Put Cloudflare in front of `nolto.social` and add a Worker rule:
```javascript
// Cloudflare Worker
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/.well-known/webfinger')) {
    const target = 'https://anknmcmqljejabxbeohv.supabase.co/functions/v1/webfinger' 
                   + url.search;
    event.respondWith(fetch(target));
  } else {
    event.respondWith(fetch(event.request));
  }
});
```

**Option B: Separate subdomain for federation**
Configure `ap.nolto.social` to point directly to Supabase functions, then update all actor URLs to use that subdomain. This requires changing the WebFinger template in `host-meta`.

**Option C: Use a different hosting platform**
Deploy to Vercel or Cloudflare Pages which support rewrites for `/.well-known/` paths.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/nodeinfo/index.ts` | Replace Deno KV with in-memory cache, fix path handling |
| `supabase/functions/instance/index.ts` | Replace Deno KV with in-memory cache |
| `public/.well-known/webfinger/index.html` | Add static redirect fallback (limited use) |

## What Won't Be Fixed (Platform Limitation)

The core issue is that **Lovable's static hosting cannot proxy HTTP requests to external services**. The files `_redirects` and `vercel.json` are ignored. To achieve full federation where Mastodon can discover `@user@nolto.social`, you need either:

1. A CDN/proxy layer (Cloudflare) that can intercept and route `/.well-known/` requests
2. DNS-level routing to send `/.well-known/*` traffic to a different server
3. A hosting platform that supports server-side rewrites

## Summary

| Component | Status | Fix |
|-----------|--------|-----|
| WebFinger function | Now deployed | Already working |
| NodeInfo function | Broken (Deno KV) | Remove Deno KV, use memory cache |
| Instance function | Broken (Deno KV) | Remove Deno KV, use memory cache |
| Host-meta | Working | Static file serves correctly |
| Routing to functions | Blocked | Requires external proxy (Cloudflare) |

