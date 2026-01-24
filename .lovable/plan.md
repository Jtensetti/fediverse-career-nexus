
# User Discovery Fix Plan

## Problem Summary

When other Fediverse instances search for `@jrossstocholm@nolto.social`, the discovery fails. I tested the WebFinger endpoint and found the root cause:

**The `/.well-known/webfinger` path returns 404** because there's no routing configured to forward requests from `nolto.social/.well-known/webfinger` to the Supabase edge function.

## Current Architecture Issues

### Issue 1: Missing Well-Known Path Routing
The edge functions are deployed at:
- `https://anknmcmqljejabxbeohv.supabase.co/functions/v1/webfinger`

But Fediverse instances look for:
- `https://nolto.social/.well-known/webfinger?resource=acct:user@nolto.social`

There's **no proxy/redirect configuration** to route these paths.

### Issue 2: Most Actors Missing Public Keys
Database check shows **160 active actors but only 16 have public keys**. Without public keys, other instances can't verify HTTP signatures for federation activities.

### Issue 3: Build Error (Unrelated but blocking)
The `auth-signup` function has a Deno compatibility error with `npm:resend@2.0.0` that needs fixing.

### Issue 4: Actor URL Uses Supabase Domain
The actor URLs are generated as:
```
https://anknmcmqljejabxbeohv.supabase.co/functions/v1/actor/jrossstocholm
```

But they should be:
```
https://nolto.social/functions/v1/actor/jrossstocholm
```
or ideally:
```
https://nolto.social/@jrossstocholm
```

## Solution

### Phase 1: Fix Build Error First

**File: `supabase/functions/auth-signup/index.ts`**
Change the Resend import from npm specifier to esm.sh:
```typescript
// From:
import { Resend } from "npm:resend@2.0.0";

// To:
import { Resend } from "https://esm.sh/resend@2.0.0";
```

### Phase 2: Add Well-Known Routing Config

Since this is a Lovable-hosted project, we need to add a `public/_redirects` file (Netlify-style) or handle it via the Supabase config.

**Option A: Add Supabase config for JWT-less access**
Update `supabase/config.toml` to allow public access to federation endpoints:
```toml
[functions.webfinger]
verify_jwt = false

[functions.actor]
verify_jwt = false

[functions.nodeinfo]
verify_jwt = false

[functions.inbox]
verify_jwt = false

[functions.outbox]
verify_jwt = false

[functions.followers]
verify_jwt = false

[functions.following]
verify_jwt = false
```

**Option B: Create a client-side redirect handler**
Since the frontend runs at `nolto.social`, we can add API routes that proxy to edge functions. However, well-known paths require server-side handling which Vite can't provide in production.

**Recommended Solution**: The WebFinger endpoint needs to be accessible at the standard path. Since Lovable uses Cloudflare/Vercel for hosting, we need to:

1. Add a `vercel.json` or `_redirects` file with rewrites
2. Or use a custom domain on the Supabase project that matches

### Phase 3: Fix Actor URL Generation

**File: `supabase/functions/actor/utils.ts`**
Update `createActorObject` to use `nolto.social` as the domain:
```typescript
// Instead of using Supabase URL, use the production domain
const NOLTO_DOMAIN = "nolto.social";
const baseUrl = `https://${NOLTO_DOMAIN}`;
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

// Actor URL should be on the public domain
const actorUrl = `${baseUrl}/functions/v1/actor/${profile.username}`;
```

**File: `supabase/functions/webfinger/index.ts`**
Same fix - ensure the actor URL in WebFinger response uses `nolto.social`:
```typescript
const actorId = `https://nolto.social/functions/v1/actor/${profile.username}`;
const profileUrl = `https://nolto.social/profile/${profile.username}`;
```

### Phase 4: Generate Missing Public Keys

Create a batch job to generate RSA key pairs for actors missing public keys:

**File: `supabase/functions/generate-actor-keys/index.ts`** (new)
```typescript
// Iterate through actors with NULL public_key
// Generate RSA key pairs using crypto.subtle
// Update actors table with the keys
```

### Phase 5: Add Host-Meta Endpoint

Create `supabase/functions/host-meta/index.ts` to serve `/.well-known/host-meta`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
  <Link rel="lrdd" type="application/jrd+json" 
        template="https://nolto.social/.well-known/webfinger?resource={uri}"/>
</XRD>
```

## Implementation Order

1. **Fix auth-signup build error** - Change Resend import
2. **Update supabase/config.toml** - Disable JWT verification for federation endpoints
3. **Fix actor URL generation** - Use `nolto.social` domain consistently
4. **Add redirect configuration** - Create rewrites for well-known paths
5. **Generate missing keys** - Create and run key generation for existing actors
6. **Add host-meta endpoint** - For full discovery compliance

## Technical Details

### Routing Configuration File
For Lovable/Vercel hosting, add `vercel.json`:
```json
{
  "rewrites": [
    {
      "source": "/.well-known/webfinger",
      "destination": "https://anknmcmqljejabxbeohv.supabase.co/functions/v1/webfinger"
    },
    {
      "source": "/.well-known/nodeinfo",
      "destination": "https://anknmcmqljejabxbeohv.supabase.co/functions/v1/nodeinfo"
    },
    {
      "source": "/.well-known/host-meta",
      "destination": "https://anknmcmqljejabxbeohv.supabase.co/functions/v1/host-meta"
    },
    {
      "source": "/functions/v1/:path*",
      "destination": "https://anknmcmqljejabxbeohv.supabase.co/functions/v1/:path*"
    }
  ]
}
```

### Key Generation Algorithm
```typescript
const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"]
);
```

## Expected Outcome

After implementation:
1. `https://nolto.social/.well-known/webfinger?resource=acct:jrossstocholm@nolto.social` returns valid JRD+JSON
2. Mastodon/other instances can discover Nolto users by searching `@username@nolto.social`
3. All actors have valid RSA key pairs for HTTP signature verification
4. Federation activities can be properly signed and verified
