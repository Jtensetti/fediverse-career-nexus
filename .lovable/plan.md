
# Fix Intermittent "Warming Up" Feed Issue

## Problem Summary
The local feed sometimes displays a "warming up" empty state message randomly, despite content existing in the database. This creates a confusing user experience.

## Root Cause
Based on code analysis, there are two contributing factors:

1. **Query timing with authentication**: The feed query runs with `enabled: true` immediately, even before the user's auth state is fully resolved. When `user?.id` is undefined during the first render, the "following" feed logic behaves differently.

2. **No loading distinction**: The UI shows the "warming up" message whenever `allPosts` is empty after loading completes, without distinguishing between "actually no posts exist" vs "query returned unexpectedly empty."

## Solution Approach

### 1. Add query enabled condition based on auth state
Wait for auth loading to complete before running the feed query to ensure consistent results.

### 2. Add retry logic with better empty state handling
Distinguish between "no posts to show" (genuine) vs "unexpected empty result" (retry-worthy).

### 3. Add a brief retry on empty results
If the query returns empty when posts should exist, automatically retry once before showing the empty state.

---

## Technical Implementation

### File: `src/components/FederatedFeed.tsx`

**Change 1: Import `useAuth` loading state**
- Already imports `useAuth`, just need to use the `loading` property

**Change 2: Modify query enabled condition**
```typescript
// Before
enabled: true,

// After
enabled: !loading, // Wait for auth to resolve
```

**Change 3: Add retry logic for unexpected empty results**
- Track if this is the first query attempt
- If the query returns 0 results and we haven't retried yet, trigger one automatic refetch
- Only show "warming up" after retry also returns empty

**Change 4: Improve empty state messaging**
- Add a "Refresh" button to the empty state
- Change message to be clearer about the situation

### Pseudocode for retry logic:
```typescript
const [hasRetried, setHasRetried] = useState(false);

useEffect(() => {
  // If query completed, returned empty, and we haven't retried yet
  if (!isLoading && !isFetching && posts?.length === 0 && !hasRetried && offset === 0) {
    setHasRetried(true);
    // Wait a brief moment then refetch
    const timer = setTimeout(() => refetch(), 500);
    return () => clearTimeout(timer);
  }
}, [isLoading, isFetching, posts, hasRetried, offset, refetch]);

// Reset retry flag when feed type changes
useEffect(() => {
  setHasRetried(false);
}, [effectiveFeedType]);
```

### File: EmptyState Enhancement
Add a refresh action to the "warming up" empty state so users can manually retry.

---

## Changes Summary

| File | Change |
|------|--------|
| `src/components/FederatedFeed.tsx` | Add auth loading check to query enabled, add automatic retry on empty, add refresh button to empty state |

## Risk Assessment
- **Low risk**: Changes only affect loading/retry behavior
- **No breaking changes**: Existing functionality preserved
- **Non-invasive**: No schema changes, no edge function changes
- **Graceful fallback**: If retry doesn't help, user sees the existing empty state with a refresh option

## Testing Recommendations
1. Test feed loading when logged out
2. Test feed loading on fresh login
3. Test with different feed types (following, local, federated)
4. Test the refresh button works correctly
5. Verify no infinite retry loops occur
