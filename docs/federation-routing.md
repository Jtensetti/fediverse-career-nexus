# Federation Routing — Sole Source of Truth

**Lovable hosting does not read `public/_redirects`** (Netlify convention).
The Cloudflare Worker in front of `samverkan.se` is the **only** routing layer
for federation discovery, ActivityPub endpoints, and Mastodon-API parity.

## Required Worker rules

| Path | Action | Target |
|------|--------|--------|
| `/.well-known/webfinger` | Proxy | `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/webfinger` |
| `/.well-known/nodeinfo` | Proxy | `…/functions/v1/nodeinfo` |
| `/.well-known/host-meta` | Proxy | `…/functions/v1/host-meta` |
| `/.well-known/oauth-authorization-server` | Proxy | `…/functions/v1/oauth-authorization-server` |
| `/nodeinfo/:path*` | Proxy | `…/functions/v1/nodeinfo/:path*` |
| `/api/v1/instance` | Proxy | `…/functions/v1/mastodon-api/api/v1/instance` |
| `/api/v1/apps` | Proxy | `…/functions/v1/mastodon-api/api/v1/apps` |
| `/api/v2/search` | Proxy | `…/functions/v1/mastodon-api/api/v2/search` |
| `/functions/v1/:path*` | Proxy | `…/functions/v1/:path*` |

## Migration redirects (post URL switch)

Add **301 redirects** so external instances that cached the old supabase.co
hostnames discover the canonical one:

| From | To |
|------|-----|
| `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/actor/:user` | `https://samverkan.se/functions/v1/actor/:user` |
| `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/inbox/:user` | `https://samverkan.se/functions/v1/inbox/:user` |
| `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/outbox/:user` | `https://samverkan.se/functions/v1/outbox/:user` |
| `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/followers/:user` | `https://samverkan.se/functions/v1/followers/:user` |
| `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/following/:user` | `https://samverkan.se/functions/v1/following/:user` |

Note: redirects only help during HTML/profile fetches; for cached
`publicKey.publicKeyPem` we additionally broadcast an `Update Person` activity
via the `broadcast-update-person` admin function (see below).

## Cache invalidation after domain migration

Run once after the URL switch (admin only):

```ts
await supabase.functions.invoke("broadcast-update-person");
```

This enqueues a signed `Update Person` activity for every local actor. Remote
instances will replace their cached actor JSON (incl. `publicKey`) with the
canonical `samverkan.se` IDs.

## DB sanity check

Verify no follower rows still point at the old hostname:

```sql
SELECT count(*) FROM actor_followers WHERE follower_actor_url LIKE '%supabase.co%';
```

Expected: `0`. If non-zero, run an `UPDATE` rewriting to `samverkan.se`.
