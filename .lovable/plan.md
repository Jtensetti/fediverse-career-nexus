

# Codebase Cleanup & Refactoring

## Problem
Several files are oversized (700+ lines), one component is misplaced, App.tsx has an incorrect import and inconsistent formatting, and some loose pages could be better organized.

---

## 1. Move misplaced file

**`src/components/BlockUserDialog.tsx`** → **`src/components/moderation/BlockUserDialog.tsx`**

It's the only loose file in `src/components/` and belongs with the other moderation components. Update the one import in `FederatedPostCard.tsx` and the `moderation/index.ts` barrel.

## 2. Fix App.tsx import + clean up formatting

- Line 53: Change `import InstanceGuidelinesPage from "./components/legal/InstanceGuidelines"` → `from "./pages/legal/InstanceGuidelines"`
- Consolidate imports using barrel files where possible (e.g. group all `pages/jobs/*` into one import from `./pages/jobs`)
- Fix inconsistent indentation (lines 160-167 use different indent level than surrounding routes)

## 3. Split FederatedPostCard.tsx (712 lines)

Extract into focused sub-components in `src/components/federation/post-card/`:

| New file | What it contains | ~Lines |
|----------|-----------------|--------|
| `PostCardHeader.tsx` | Avatar, name, date, instance badge, dropdown menu | ~120 |
| `PostCardContent.tsx` | Content rendering, truncation, sanitization, media grid | ~150 |
| `PostCardActions.tsx` | Boost, reply, share buttons + handlers | ~80 |
| `PostCardDialogs.tsx` | Delete confirm, report, block, quote-repost dialogs | ~60 |
| `postCardUtils.ts` | Helper functions: `getRawContent`, `getActorName`, `getAvatarUrl`, `getMediaAttachments`, `getModerationBanner` | ~120 |
| `index.tsx` | Main component that composes the above (re-exports as default) | ~100 |

Total: same code, just split into readable units. Zero behavior change.

## 4. Extract StatCard from ModerationDashboard.tsx (523 lines)

Move the inline `StatCard` component (lines 47-100) to `src/components/moderation/StatCard.tsx`. This is a self-contained presentational component that has no business living inside a page file.

## 5. Move loose pages into subdirectories

| File | Move to | Reason |
|------|---------|--------|
| `src/pages/Notifications.tsx` | `src/pages/social/Notifications.tsx` | Social feature |
| `src/pages/PostView.tsx` | `src/pages/posts/PostView.tsx` | Post-related |
| `src/pages/Search.tsx` | `src/pages/search/Search.tsx` | Standalone domain |
| `src/pages/FeedSettings.tsx` | `src/pages/settings/FeedSettings.tsx` | Settings page |
| `src/pages/ModerationDashboard.tsx` | `src/pages/moderation/ModerationDashboard.tsx` | Moderation domain |
| `src/pages/NotFound.tsx` | Keep in place | It's a special route, fine at root |
| `src/pages/Home.tsx` | Keep in place | Entry point, fine at root |
| `src/pages/Index.tsx` | Keep in place | Entry point, fine at root |

Update all imports in `App.tsx` accordingly. Create `index.ts` barrels for new directories.

---

## What does NOT change
- Zero logic, UI, or behavior changes
- No database changes
- No edge function changes
- File contents stay identical — only locations, imports, and file splits change

## Execution order
1. Move `BlockUserDialog.tsx` → `moderation/`, update imports
2. Move loose pages into subdirectories, update App.tsx imports
3. Fix App.tsx InstanceGuidelines import + clean up formatting
4. Split `FederatedPostCard.tsx` into sub-components
5. Extract `StatCard` from `ModerationDashboard.tsx`
6. Update all barrel `index.ts` files
7. Verify build passes

