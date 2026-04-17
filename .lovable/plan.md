

# Codebase Cleanup — No Platform Changes

Audit findings, all behavior-preserving fixes. Grouped by severity.

## 1. Critical: Broken / nonsensical patterns

### 1a. `Home.tsx` ↔ `Index.tsx` circular structure (BUG)
- `App.tsx` routes `/` to `<Index>`. `Index.tsx` renders `<Home>` when authed. `Home.tsx` then renders `<Index>` when unauthed. Two pages bouncing into each other.
- Net behavior is correct only by accident (the `useEffect` redirect in Home fires before render completes).
- **Fix**: Delete `src/pages/Home.tsx`. Inline its only logic (redirect authed users to `/feed`) into `Index.tsx`. One source of truth for the `/` route.

### 1b. Broken `(window as any).supabase?.auth?.user()?.id` in `ArticleEdit.tsx:76`
- This API does not exist on supabase-js v2. `window.supabase` is never assigned anywhere. `isPrimaryAuthor` is **always `false`**.
- **Fix**: Use the auth context (`useAuth()`) properly. Compare against `user?.id`. This is a real bug masked as working code.

### 1c. TipTap editor commands attached to `window` (`__tiptapEditor`)
- `TipTapEditor.tsx` writes its command API to `window.__tiptapEditor`. `ArticleEditor.tsx` reads it back via `(window as any)`.
- Bypasses React entirely, untyped, breaks SSR, breaks if two editors mount.
- **Fix**: Lift commands via `forwardRef` + `useImperativeHandle`, or pass an `onReady(api)` callback. Same external behavior, type-safe, no globals.

## 2. Duplicate files

### 2a. Two `SkipToContent.tsx` (common/ + layout/)
- Only `common/SkipToContent` is imported. `layout/SkipToContent.tsx` (and its barrel export) is dead.
- The common one has hardcoded English `"Skip to main content"`; the layout one uses `t('accessibility.skipToContent')`. Per memory, Swedish-first with i18n.
- **Fix**: Keep one file at `common/`, port the `useTranslation` version into it, delete `layout/SkipToContent.tsx` + its barrel export.

### 2b. `src/components/ui/use-toast.ts` is a re-export shim
- Just re-exports `@/hooks/use-toast`. Nothing imports the shim path.
- **Fix**: Delete the shim file.

## 3. Type safety leaks (~70+ `as any`)

### 3a. Schema-typed-table casts
- Patterns like `.from("site_alerts" as any)` and `.from('linkedin_imports' as any)` mean these tables exist in DB but aren't in the generated `types.ts`. Either the table was added without a migration regen, or it's stale.
- **Fix (no platform change)**: Verify each `as any` table actually exists; trigger types regeneration so the casts can be removed.

### 3b. `(post.content as any)` repeated 6+ places
- ActivityPub `content` JSONB is typed `Json` but always read as a structured object. Each call site re-asserts.
- **Fix**: Define a single `APNoteContent` interface in `src/lib/federation.ts` + a typed parser `parseNoteContent(raw): APNoteContent`. Replace ~15 `as any` reads with one helper. Memory already mentions a robust-parsing pattern; this consolidates it.

### 3c. `Select onValueChange={v => setX(v as any)}`
- 5 occurrences in admin/moderation forms. The setter type is wider than the `Select` value union.
- **Fix**: Type the state as the proper union (`'pending' | 'approved' | 'rejected'`), drop the cast.

## 4. Logging hygiene

- 102 `console.*` calls across 16 files, mostly debug leftovers. Production bundles ship them.
- **Fix**: Add a tiny `src/lib/logger.ts` (`debug` no-ops in prod, `error` always logs). Search-and-replace. Zero behavior change in prod, cleaner DevTools.

## 5. Toast inconsistency

- 91 imports of `toast` from `sonner` directly, 16 from `@/hooks/use-toast` (the shadcn wrapper). Two parallel toast systems.
- App.tsx already mounts only the `Toaster` from `@/components/ui/sonner`, so the shadcn `useToast` hook's toasts may not even render.
- **Fix**: Pick one (sonner, since it's what App actually mounts). Migrate the 16 stragglers. Delete `hooks/use-toast.ts` + `components/ui/use-toast.ts` + `components/ui/toast.tsx` + `components/ui/toaster.tsx` if unused after migration.

## 6. Oversized files (split, don't rewrite)

| File | Lines | Split target |
|------|------:|--------------|
| `pages/profile/ProfileEdit.tsx` | 1200 | Already has tab-like sections — extract into `profile-edit/` sub-components per section (Basic, Experience, Education, Skills, Privacy). |
| `pages/profile/Profile.tsx` | 996 | Extract tab panels (`ProfileAbout`, `ProfileExperience`, `ProfilePosts`, `ProfileArticles`). |
| `services/messaging/messageService.ts` | 736 (23 exports) | Split into `messageQueries.ts` (read), `messageMutations.ts` (send/delete), `messageRealtime.ts` (subscriptions). |
| `services/social/connectionsService.ts` | 660 (17 exports) | Split into `connectionRequests.ts`, `connectionQueries.ts`, `mutualConnections.ts`. |
| `pages/auth/Auth.tsx` | 669 | Extract `LoginForm`, `SignupForm`, `PasswordResetForm`. |
| `components/posts/PostComposer.tsx` | 610 | Extract `MediaUploader`, `PollComposer`, `ContentWarningField`. |

Pure mechanical extraction — same component tree, same props in/out.

## 7. App.tsx routing cleanup
- Mixed indentation lines 160-167 (4-space inside 20-space block) — formatter pass.
- 8 `Navigate` redirect routes for old `/company/*` URLs and typo aliases (`/job` → `/jobs`) — fine but worth a comment block grouping them as "Legacy redirects".

## 8. Edge functions: dead code check
48 edge functions present. Likely unused (need verification before deletion):
- `middleware/` — not invoked by the proxy worker config.
- `cache-manager/` — no client calls.
- `analytics/` — superseded by `federation-coordinator` per recent migrations.

**Fix**: Add a one-liner header comment to each edge function describing who calls it. Functions with no caller after a grep sweep get deleted in a follow-up (separate PR for safety).

## 9. Tiny housekeeping
- `vite.config.ts` `inlineLovableEnv` plugin can be removed — the build-time check + standard Vite env injection is sufficient now that fallbacks are gone. Remove the manual string-replacement plugin.
- `.env.example` should mirror the 3 required vars.
- Add `npm run typecheck` script (`tsc --noEmit`) and reference from `CONTRIBUTING.md`.

## What does NOT change
- Zero UI/UX, zero routes, zero feature changes.
- No DB migrations.
- No edge function logic changes (only header comments + dead-function audit list).
- All public URLs identical.

## Execution order
1. Fix critical bugs: Home/Index circular ref, ArticleEdit window.supabase, TipTap window globals.
2. Delete duplicate files (SkipToContent, ui/use-toast.ts).
3. Add `APNoteContent` type + parser; remove `content as any` casts.
4. Type Select unions properly (remove form `as any`).
5. Introduce `logger.ts`, replace `console.*`.
6. Standardize on sonner toast; remove shadcn toast files if orphaned.
7. Mechanical split of 6 oversized files.
8. App.tsx formatter pass + comment grouping.
9. Drop `inlineLovableEnv` plugin from vite.config.ts.
10. Verify `tsc --noEmit` + `vite build` pass.

