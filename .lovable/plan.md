
## Goal
Make the app feel “live” so you don’t need manual refreshes:
1) Browser tab title updates immediately on navigation.
2) Common “I need to refresh to see updates” cases are removed by improving the client-side data refresh strategy (without making the app slow).

## What’s happening (based on the code)
### A) Tab title only changes when a page renders `SEOHead`
- `SEOHead` (react-helmet-async) updates `<title>` when it’s rendered.
- Many route pages currently **don’t render `SEOHead` at all** (example: `src/pages/FederatedFeed.tsx` in current code).
- So after visiting a profile (which *does* set a title), navigating to a page that doesn’t set one leaves the old title until a full reload.

### B) Many pages won’t refetch data on navigation/window focus
In `src/App.tsx`, the React Query client is configured with:
- `refetchOnMount: false`
- `refetchOnWindowFocus: false`
- `staleTime: 30000`

This combination makes the UI feel “sticky” (fast, but stale), which often looks like “I need to refresh”.

### C) Some flows explicitly call `window.location.reload()`
Examples found:
- Profile sync from fediverse (`src/pages/Profile.tsx`)
- LinkedIn import completion (`src/pages/ProfileEdit.tsx`)
Those reloads are a symptom of missing invalidation/refetch wiring.

---

## Implementation Plan

### Phase 1 — Fix tab titles so they update on every navigation (no refresh)
1. **Add `SEOHead` to key missing pages** (highest-impact first):
   - `src/pages/FederatedFeed.tsx` → title: `Feed | Nolto`
   - `src/pages/Messages.tsx` → title: `Messages | Nolto`
   - `src/pages/Notifications.tsx` → title: `Notifications | Nolto`
   - `src/pages/Connections.tsx` → title: `Connections | Nolto`
   - `src/pages/SavedItems.tsx` → title: `Saved Items | Nolto`
   - Then continue through the remaining route pages that don’t set titles (events, articles list/manage/create/edit, settings, etc.).

2. **Make it harder to forget titles in the future**
   - Enhance `DashboardLayout` so that if a page passes `title`/`description`, the layout automatically renders `<SEOHead title={title} description={description} />`.
   - Add a small escape hatch like `disableSEO` or `seoTitle` so pages with special/dynamic titles (Profile, ArticleView, JobView) can keep full control without duplicating or conflicting.

3. **Replace direct `Helmet` usage with `SEOHead`**
   - Pages like `CodeOfConductPage`, `InstanceGuidelines`, `Instances`, etc. currently use `Helmet` directly. Standardize on `SEOHead` so behavior is consistent everywhere.

**Verification (Phase 1)**
- Visit a profile → then navigate to Feed/Messages/Connections → tab title changes immediately without refresh.

---

### Phase 2 — Reduce “manual refresh required” by refreshing data at the right times
This is the “make it feel live” part.

4. **Adjust React Query defaults to be less stale**
   - Update `QueryClient` defaults in `src/App.tsx`:
     - Change `refetchOnMount` to `true` (or `"always"` for maximum freshness)
     - Change `refetchOnWindowFocus` to `true`
   - Keep `staleTime` (30s) as-is initially, then tune if needed.

**Why this helps:** when you navigate back to a screen (or return to the tab), it will automatically refetch and pick up changes—no manual browser refresh.

5. **Replace the most visible `window.location.reload()` calls with proper invalidation**
   - Profile sync success:
     - Instead of `window.location.reload()`, invalidate the profile query keys and refetch (ex: `queryClient.invalidateQueries({ queryKey: ["profile", usernameOrId] })` depending on how profile queries are keyed in your app).
   - LinkedIn import completion:
     - Replace reload with invalidating profile-related queries and optionally showing a toast “Profile updated”.

6. **Replace “Try again” reload buttons with refetch**
   - Example: Messages error state currently uses a button that calls `window.location.reload()`.
   - Update to call the query’s `refetch()` (or invalidate the relevant query key) so only the broken data reloads, not the whole SPA.

**Verification (Phase 2)**
- Create/edit something, navigate away and back → changes appear automatically.
- Switch browser tabs and come back → lists refresh (feed, jobs, notifications, etc.) without you doing anything.

---

### Phase 3 — Targeted “auto updates” for high-velocity pages (optional, if you want it to feel even more real-time)
7. Feed freshness options (choose one based on your preference):
   - Lightweight: `refetchOnWindowFocus + refetchOnMount` is often enough.
   - More live: add `refetchInterval` (e.g., 60s) for `federatedFeed` queries.
   - Most live: integrate a realtime subscription approach (only if needed; more complexity).

---

## Rollout strategy (fast results)
1) Implement Phase 1 first (titles). This should immediately fix the “title needs refresh” issue.
2) Implement Phase 2 next (query defaults + remove reloads). This should noticeably reduce most manual refresh needs across the app.
3) Only do Phase 3 if you still want the feed to “tick” without interaction.

---

## One quick clarification (so we target the biggest pain)
After Phase 1, if you still feel forced to refresh: which screens/actions most often need it?
Examples:
- “After posting, the feed doesn’t show my post”
- “After editing profile, profile page doesn’t update”
- “Connections count doesn’t update”
We’ll prioritize those flows and ensure the right query keys are invalidated/refetched.
