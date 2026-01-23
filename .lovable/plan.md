

# Performance Optimization Plan: Fix Slow Page Loading

## Problem Analysis

Based on my investigation, the site is loading slowly due to multiple sequential database queries and redundant operations during authentication and feed loading. Here's what's happening:

### Key Performance Bottlenecks Identified

1. **AuthContext Sequential Operations** (Lines 82-115 in `AuthContext.tsx`)
   - On sign-in, the system runs:
     - `ensureUserProfile()` - multiple DB queries
     - Check for existing actor in `public_actors`
     - Potentially create a new actor via `createUserActor()`
   - These run **synchronously** and block the loading state

2. **Double Profile Fetch in ensureUserProfile** (Lines 247-259 in `profileService.ts`)
   - `getCurrentUserProfile()` calls `ensureUserProfile()` first
   - Then immediately does another full profile fetch
   - This means **2+ database round trips** for every profile check

3. **Redundant supabase.auth.getUser() Calls**
   - `getFederatedFeed()` calls `supabase.auth.getUser()` on every feed fetch (line 74)
   - This is already available from the AuthContext
   - Each `getUser()` call adds network latency

4. **Batch Data Fetching Not Parallelized**
   - In `getBatchPostData()`, queries run sequentially:
     1. Reactions query
     2. Actor ID query
     3. Boost counts RPC
     4. Reply counts RPC
     5. User boosts query
   - These could be parallelized with `Promise.all()`

5. **Index Page Double Rendering**
   - `Index.tsx` checks `loading` state and renders spinner
   - If user exists, renders `Home.tsx`
   - `Home.tsx` also checks `loading` state and renders another spinner
   - Then redirects to `/feed` - causing unnecessary renders

---

## Solution Overview

### Phase 1: AuthContext Optimization (Quick Wins)

**Goal**: Make auth setup non-blocking and faster

| Change | Impact |
|--------|--------|
| Move profile/actor setup to background | Immediate UI response |
| Use cached session from AuthContext instead of calling `getUser()` | Eliminate redundant API calls |
| Parallelize profile check and actor check | Reduce wait time by ~50% |

### Phase 2: Remove Redundant Database Calls

**Goal**: Eliminate double-fetching and sequential bottlenecks

| Change | Impact |
|--------|--------|
| Make `ensureUserProfile` return full profile data | Remove second fetch |
| Pass user ID to feed service instead of calling getUser() | Remove API call per feed load |
| Parallelize batch data queries with Promise.all() | Faster feed enrichment |

### Phase 3: Feed Loading Optimization

**Goal**: Make feed appear faster

| Change | Impact |
|--------|--------|
| Show skeleton immediately, don't wait for batch data | Perceived performance boost |
| Defer batch data loading after initial render | Content visible faster |
| Remove blocking getUser() call from getFederatedFeed() | Faster feed queries |

---

## Detailed Implementation

### File: `src/contexts/AuthContext.tsx`

**Change 1: Non-blocking user setup**

Move the profile/actor setup to a fire-and-forget background task. The UI doesn't need to wait for this:

```typescript
// After setting user/session, start setup in background without awaiting
if (event === 'SIGNED_IN' && session?.user) {
  // Don't block the UI - run in background
  void setupUserInBackground(session.user.id);
}
```

**Change 2: Parallelize profile and actor checks**

```typescript
const setupUserInBackground = async (userId: string) => {
  // Check cache first
  const cacheKey = `user_setup_${userId}`;
  const cachedSetup = localStorage.getItem(cacheKey);
  if (cachedSetup && Date.now() - JSON.parse(cachedSetup).timestamp < 300000) {
    return;
  }
  
  // Run profile and actor checks in parallel
  const [profile, existingActor] = await Promise.all([
    ensureUserProfile(userId),
    supabase.from('public_actors').select('id').eq('user_id', userId).maybeSingle()
  ]);
  
  if (profile && !existingActor.data) {
    await createUserActor(userId);
  }
  
  localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now() }));
};
```

### File: `src/services/profileService.ts`

**Change 3: Eliminate double fetch in getCurrentUserProfile**

Instead of calling `ensureUserProfile()` then fetching again, have `ensureUserProfile` return all needed data:

```typescript
// In ensureUserProfile - when profile exists, return full data
if (profile) {
  // Already have the profile, fetch full data in one go
  const { data: fullProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return fullProfile;
}
```

### File: `src/services/federationService.ts`

**Change 4: Accept userId as parameter instead of calling getUser()**

```typescript
export const getFederatedFeed = async (
  limit: number = 20, 
  offset: number = 0,
  feedType: FeedType = 'all',
  userId?: string  // Add optional parameter
): Promise<FederatedPost[]> => {
  // Remove: const { data: { user } } = await supabase.auth.getUser();
  // Use the passed userId instead
```

### File: `src/services/batchDataService.ts`

**Change 5: Parallelize batch queries**

```typescript
// Run all independent queries in parallel
const [reactionsResult, boostCountsResult, replyCountsResult, actorResult] = 
  await Promise.all([
    supabase.from('reactions').select('target_id, reaction, user_id')
      .eq('target_type', 'post').in('target_id', postIds),
    supabase.rpc('get_batch_boost_counts', { post_ids: postIds }),
    supabase.rpc('get_batch_reply_counts', { post_ids: postIds }),
    userId ? supabase.from('actors').select('id').eq('user_id', userId).single() 
           : Promise.resolve({ data: null })
  ]);
```

### File: `src/components/FederatedFeed.tsx`

**Change 6: Pass user ID to feed service**

```typescript
const { data: posts, isLoading, isFetching, error, refetch } = useQuery({
  queryKey: ['federatedFeed', limit, offset, effectiveFeedType],
  queryFn: () => getFederatedFeed(limit, offset, effectiveFeedType, user?.id), // Pass user ID
  staleTime: 30000,
  enabled: true,
});
```

### File: `src/pages/Home.tsx`

**Change 7: Eliminate double loading spinner**

Since `Index.tsx` already handles the loading state and auth check, simplify `Home.tsx`:

```typescript
const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/feed");
    }
  }, [user, navigate]);

  // Show nothing - Index.tsx handles unauthenticated state
  return null;
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/AuthContext.tsx` | Non-blocking setup, parallel checks |
| `src/services/profileService.ts` | Return full profile from ensureUserProfile |
| `src/services/federationService.ts` | Accept userId parameter |
| `src/services/batchDataService.ts` | Parallelize with Promise.all |
| `src/components/FederatedFeed.tsx` | Pass user ID to feed service |
| `src/pages/Home.tsx` | Remove redundant loading check |

---

## Expected Improvements

| Before | After |
|--------|-------|
| 4-5 sequential API calls on auth | 2 parallel calls in background |
| 2 profile fetches per login | 1 profile fetch |
| getUser() on every feed load | User ID from context (cached) |
| 5 sequential batch queries | 4 parallel batch queries |
| 10+ second timeout possible | Sub-2 second typical load |

---

## Technical Notes

- All changes are backward-compatible
- No database migrations required
- The 10-second timeout safeguard in AuthContext can be reduced to 5 seconds after these optimizations
- Consider adding performance monitoring (console.time/timeEnd) to measure improvements

