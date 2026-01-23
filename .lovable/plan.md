
# Fix: Federated Login "Redirect URI Mismatch" Error

## Problem Summary

Login is failing with "invalid_grant" error because the redirect URI used during token exchange doesn't match the one used during authorization. This happens because:

1. An OAuth app was previously registered on `mastodon.nu` with `nolto.social` as the redirect URI
2. When accessing from the preview domain (`lovableproject.com`), a new app registration was attempted
3. This caused redirect URI mismatches during the token exchange phase

## Root Cause

The error logs show:
```
Token exchange failed: 400 - {"error":"invalid_grant","error_description":"...matchar inte den omdirigering URI..."}
```

The OAuth flow requires that the **exact same redirect URI** is used in both:
1. The authorization request (sent to Mastodon)
2. The token exchange request (sent after callback)

## Solution

### Step 1: Delete the corrupt OAuth client record

Delete the existing `mastodon.nu` OAuth client from the database so a fresh registration can occur with proper redirect URIs.

```sql
DELETE FROM oauth_clients WHERE instance_domain = 'mastodon.nu';
```

### Step 2: Update the callback function to use consistent redirect URI

Modify `federated-auth-callback` to always use the redirect URI that was stored in the authorization URL (embedded in the state parameter) rather than relying on client-provided value or database lookup.

**File**: `supabase/functions/federated-auth-callback/index.ts`

**Changes**:
- Store the redirect URI in the state parameter during init
- Use that stored value during token exchange (guarantees exact match)

### Step 3: Update the init function to store redirect URI in state

Modify `federated-auth-init` to include the redirect URI in the encoded state, ensuring perfect consistency.

**File**: `supabase/functions/federated-auth-init/index.ts`

**Changes**:
- Add `redirectUri` to the state data object
- This will be decoded and used in the callback

---

## Technical Details

### State Parameter Enhancement

Current state structure:
```json
{
  "domain": "mastodon.nu",
  "username": "jtensetti", 
  "actorUrl": "https://...",
  "timestamp": 1234567890
}
```

New state structure:
```json
{
  "domain": "mastodon.nu",
  "username": "jtensetti",
  "actorUrl": "https://...",
  "redirectUri": "https://...lovableproject.com/auth/callback",
  "timestamp": 1234567890
}
```

### Callback Function Update

```typescript
// Line 170 - Change from:
redirectUri || oauthClient.redirect_uri

// To:
stateData.redirectUri || redirectUri || oauthClient.redirect_uri
```

This ensures the token exchange always uses the exact URI that was part of the authorization request.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/federated-auth-init/index.ts` | Add `redirectUri` to state data |
| `supabase/functions/federated-auth-callback/index.ts` | Prioritize state-embedded redirectUri |

## Database Cleanup

| Action | Query |
|--------|-------|
| Delete corrupt client | `DELETE FROM oauth_clients WHERE instance_domain = 'mastodon.nu';` |

---

## Expected Outcome

After these changes:
1. The redirect URI will be preserved in the cryptographically-protected state parameter
2. Token exchange will always use the exact same URI as the authorization request
3. No more "invalid_grant" redirect URI mismatch errors
4. Login will work consistently from any domain (preview, nolto.social, etc.)
