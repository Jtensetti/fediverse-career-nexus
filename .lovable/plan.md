# Federation Stability Plan - COMPLETED ✅

**Implementation completed**: 2026-02-06

---

## Summary of Changes

### Phase 1: Critical Architecture & Stability ✅

#### 1.1 Created `lookup-remote-actor` Edge Function
- **File**: `supabase/functions/lookup-remote-actor/index.ts`
- Server-side WebFinger proxy to avoid CORS issues
- Two-step domain validation (URL constructor + regex)
- 10-second timeout with AbortController
- Caches results in `webfinger_cache` table (1-hour TTL)
- Also caches actor documents in `remote_actors_cache`
- Returns actor URL + inbox URL

#### 1.2 Updated Client to Use Proxy
- **File**: `src/services/federationMentionService.ts`
- Replaced direct `fetch(webfingerUrl)` with Edge Function call
- Removed client-side `getRemoteActorInbox` function
- Added graceful fallback if proxy fails

#### 1.3 Added Timeout Guards
- **File**: `supabase/functions/federation/index.ts`
- Created `fetchWithTimeout` utility with AbortController
- 10-second timeout for actor document fetches
- Proper error handling for timeout/abort scenarios

### Phase 2: Logic & Data Safety ✅

#### 2.1 Fixed Null Safety
- **File**: `supabase/functions/federation/index.ts`
- Added environment variable validation at startup
- Returns 500 error if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing
- Added recipient URI validation before processing
- Replaced `any` types with proper type guards

#### 2.2 Hardened Tombstone Logic
- **File**: `supabase/functions/actor/utils.ts`
- Added proper type guard for `content` field
- Safe access to `formerType` and `deleted` with string validation

#### 2.3 Enhanced Error Logging
- **File**: `src/services/postService.ts`
- Improved mention processing logging with structured data
- NO database writes for failures (uses console.warn)

### Phase 3: Database & Documentation ✅

#### 3.1 Created `webfinger_cache` Table
- Separate cache for WebFinger (acct → actor_url) mappings
- 1-hour TTL via `expires_at` column
- Hit count tracking for cache analytics
- Indexed on `acct` and `expires_at`

#### 3.2 Added SQL Trigger Documentation
- Added COMMENT to `queue_delete_for_federation` function
- Explains NULL return behavior for Tombstone compliance

---

## Caching Architecture

```
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

## Error Handling Strategy

| Error Type          | Action                    | Log Level |
|---------------------|---------------------------|-----------|
| Invalid domain      | Return 400, skip          | warn      |
| WebFinger timeout   | Return 504                | warn      |
| WebFinger 404       | Return 404, skip mention  | info      |
| Actor fetch fail    | Retry later               | error     |
| Inbox delivery fail | Queue for retry           | error     |

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/lookup-remote-actor/index.ts` | NEW - WebFinger proxy |
| `supabase/migrations/XXXX_webfinger_cache.sql` | NEW - Cache table |
| `src/services/federationMentionService.ts` | Updated to use proxy |
| `supabase/functions/federation/index.ts` | Timeout guards, null safety |
| `supabase/functions/actor/utils.ts` | Type-safe Tombstone handling |
| `src/services/postService.ts` | Enhanced error logging |

## Test Results

✅ WebFinger lookup: `Gargron@mastodon.social` → `https://mastodon.social/users/Gargron`
✅ Cache hit on repeat request: `cached: true`
✅ Invalid domain rejection: `invalid..domain` → 400 error
✅ Inbox URL resolved: `https://mastodon.social/users/Gargron/inbox`
