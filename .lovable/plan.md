

# Adjusted Federation Stability Plan

## Incorporated Feedback

### Risk 1: Database Logging (Point 3.2) - REMOVED

You're correct - writing to `federation_request_logs` on every failed lookup is dangerous. Looking at the existing table schema, it's designed for request tracking, not error logging.

**Adjustment**: 
- Use `console.error` for failures (Supabase logs to Logflare automatically)
- Remove the `logFailedLookup` function entirely from the plan
- For critical monitoring, implement a simple counter metric (no DB writes)

---

### Risk 2: WebFinger vs Actor Caching - NEW TABLE REQUIRED

You're right that WebFinger (JRD) and Actor documents are different:
- **WebFinger**: `acct:user@domain` → `https://domain/users/user` (the mapping)
- **Actor**: `https://domain/users/user` → `{inbox, outbox, sharedInbox, ...}` (the data)

**Current state**: `remote_actors_cache` only caches **Actor documents** (indexed by `actor_url`)

**Adjustment**: Create a separate `webfinger_cache` table:

```sql
CREATE TABLE IF NOT EXISTS webfinger_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acct TEXT UNIQUE NOT NULL,           -- e.g., "user@mastodon.social"
  actor_url TEXT NOT NULL,             -- resolved actor URL
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX idx_webfinger_acct ON webfinger_cache(acct);
CREATE INDEX idx_webfinger_expires ON webfinger_cache(expires_at);
```

This separates the two cache layers and allows proper TTL management.

---

### Risk 3: Regex Validation - TWO-STEP APPROACH

**Adjustment**: Use URL constructor as cheap first-pass validation:

```typescript
function isValidDomain(domain: string): boolean {
  // Step 1: Cheap URL constructor check
  try {
    new URL(`https://${domain}`);
  } catch {
    return false;
  }
  
  // Step 2: Character format check (only if Step 1 passes)
  const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return domain.length <= 253 && DOMAIN_REGEX.test(domain);
}
```

---

## Revised Implementation Tasks

### Phase 1.1: Create `lookup-remote-actor` Edge Function

**New file**: `supabase/functions/lookup-remote-actor/index.ts`

**Features**:
1. Accept `resource` parameter (format: `acct:user@domain` or just `user@domain`)
2. Two-step domain validation (URL constructor + regex)
3. Check `webfinger_cache` first (1-hour TTL)
4. If miss, fetch with 10s AbortController timeout
5. Cache successful lookups
6. Return actor URL + inbox (resolve actor document in same call)
7. Use `console.error` for failures (NO database logging)

**Response format**:
```json
{
  "success": true,
  "actorUrl": "https://mastodon.social/users/user",
  "inbox": "https://mastodon.social/users/user/inbox",
  "cached": true
}
```

---

### Phase 1.2: Update Client to Use Proxy

**File**: `src/services/federationMentionService.ts`

**Changes**:
1. Replace direct `fetch(webfingerUrl)` with Edge Function call
2. Remove `getRemoteActorInbox` (now handled server-side)
3. Add graceful fallback if proxy fails

```typescript
async function lookupRemoteActor(username: string, domain: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lookup-remote-actor`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource: `${username}@${domain}` }),
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.actorUrl || null;
  } catch (error) {
    console.warn(`Remote actor lookup failed: ${username}@${domain}`, error);
    return null;
  }
}
```

---

### Phase 1.3: Add Timeout Guards to Federation Worker

**File**: `supabase/functions/federation/index.ts`

**Create shared utility**:
```typescript
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Apply to**:
- Actor document fetches: 10 seconds
- Inbox deliveries: 15 seconds (via signedFetch enhancement)

---

### Phase 2.1: Fix Null Safety

**File**: `supabase/functions/federation/index.ts`

**Line 274 fix**:
```typescript
// Add at function start
const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) {
  console.error("CRITICAL: SUPABASE_URL not configured");
  return new Response(
    JSON.stringify({ error: "Server misconfiguration" }),
    { status: 500, headers: corsHeaders }
  );
}

// Line 274 - now safe to use without assertion
if (recipientUri.startsWith(supabaseUrl)) { ... }
```

**Add recipient validation**:
```typescript
// Before processing recipientUri
if (!recipientUri || typeof recipientUri !== 'string' || !recipientUri.startsWith('http')) {
  console.warn(`Skipping invalid recipient URI: ${recipientUri}`);
  continue;
}
```

---

### Phase 2.2: Enhanced Error Logging (Console Only)

**File**: `src/services/postService.ts`

```typescript
try {
  noteObject = await processFederatedMentions(postData.content, noteObject);
  console.log('Federated mentions processed:', {
    tags: noteObject.tag?.length || 0,
    ccAddresses: (noteObject.cc as string[])?.length || 0
  });
} catch (mentionError) {
  // Log but don't block the post - NO DATABASE WRITE
  console.warn('Mention resolution failed', {
    postId,
    contentPreview: postData.content.substring(0, 50),
    error: mentionError instanceof Error ? mentionError.message : 'Unknown'
  });
}
```

---

### Phase 3: Database Migration

**New migration**: Add `webfinger_cache` table and update trigger comments

```sql
-- WebFinger cache (separate from actor cache)
CREATE TABLE IF NOT EXISTS webfinger_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acct TEXT UNIQUE NOT NULL,
  actor_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',
  hit_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_webfinger_acct ON webfinger_cache(acct);
CREATE INDEX IF NOT EXISTS idx_webfinger_expires ON webfinger_cache(expires_at);

-- Add comment to delete trigger for documentation
COMMENT ON FUNCTION queue_delete_for_federation IS 
'FEDERATION DELETE HANDLER: This trigger returns NULL to intercept and cancel DELETE operations.
The row is preserved as a Tombstone for ActivityPub compliance (RFC 7231).
To hard delete, bypass this trigger or use: SET LOCAL app.bypass_tombstone = true;';
```

---

## Summary of Changes from Original Plan

| Original Task | Status | Reason |
|---------------|--------|--------|
| Log failed lookups to DB | REMOVED | DoS risk - use console.error instead |
| Single cache table | SPLIT | WebFinger and Actor are different data types |
| Regex-only validation | IMPROVED | URL constructor as cheap first-pass |
| HTTP timeout 30s | REDUCED | 10s for lookups, 15s for deliveries |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/XXXXXX_webfinger_cache.sql` | Create |
| `supabase/functions/lookup-remote-actor/index.ts` | Create |
| `src/services/federationMentionService.ts` | Update |
| `supabase/functions/federation/index.ts` | Update |
| `src/services/postService.ts` | Update |

---

## Technical Notes

### Caching Architecture

```text
Browser                    Edge Function                  Remote Server
   |                            |                              |
   |--POST /lookup-remote-actor |                              |
   |   {resource: "u@masto.soc"}|                              |
   |                            |--Check webfinger_cache       |
   |                            |  (1h TTL)                    |
   |                            |                              |
   |                            |--[MISS] WebFinger lookup---->|
   |                            |  (10s timeout)               |
   |                            |<--actor_url-------------------|
   |                            |                              |
   |                            |--Check remote_actors_cache   |
   |                            |  (1h TTL)                    |
   |                            |                              |
   |                            |--[MISS] Actor fetch--------->|
   |                            |  (10s timeout)               |
   |                            |<--inbox, endpoints------------|
   |                            |                              |
   |                            |--Cache both responses        |
   |<--{actorUrl, inbox}--------|                              |
```

### Error Handling Strategy

```text
Error Type          | Action                    | Log Level
--------------------|---------------------------|------------
Invalid domain      | Return 400, skip          | warn
WebFinger timeout   | Return null, skip mention | warn
WebFinger 404       | Return null, skip mention | info (expected)
Actor fetch fail    | Retry later               | error
Inbox delivery fail | Queue for retry           | error
```

