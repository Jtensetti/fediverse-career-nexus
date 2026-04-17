

# Bug Hunt — Stability & Safety Cleanup

Findings are real bugs or unsafe patterns I verified by reading the code. None of the fixes change platform behavior.

## 1. Critical bugs (silent failure / privilege bypass risk)

### 1a. Hardcoded moderation gate in `Navbar.tsx`
`src/components/layout/Navbar.tsx:60-77` checks `profile.username === 'jtensetti_mastodon'` to show the moderation nav link. We just refactored `useModerationAccess` to use the database `is_admin` / `is_moderator` RPCs — but the navbar still uses the old hardcoded username. So the new admin (`jonatan_tensetti`) won't see the moderation link in the nav even though they have full access. The page itself works; only the navigation entry is broken.
- **Fix**: Replace the inline query with `useModerationAccess()`. One source of truth, matches the dashboard gate.

### 1b. TipTap editor commands hung on `window.__tiptapEditor`
`TipTapEditor.tsx:151` writes the command API to `window.__tiptapEditor`; `ArticleEditor.tsx:34` reads it back via `(window as any)`. Untyped, breaks if two editors mount, leaks across navigations. Was on the previous cleanup list but never executed.
- **Fix**: Lift via `forwardRef` + `useImperativeHandle` (or `onReady(api)` callback). Same external behavior.

### 1c. MFA check race in `AuthContext`
`src/contexts/AuthContext.tsx` calls `checkMFARequirement()` from a separate `useEffect` watching `session?.user?.id`. Between sign-in and the MFA check resolving, the user can briefly access protected routes. Low risk in practice but nondeterministic.
- **Fix**: Run MFA check inside the auth-state-change handler before flipping `loading` to false. Keeps the same UI (dialog) but removes the gap.

### 1d. `setupUserInBackground` cache key has no instance scoping
Stored in `localStorage` as `user_setup_<uuid>`. If a user signs in on one Samverkan instance, their cache persists across instances/forks pointed at different backends, causing skipped profile creation. Edge case but real.
- **Fix**: Include `VITE_SUPABASE_PROJECT_ID` in the cache key.

## 2. Unsafe `dangerouslySetInnerHTML` paths

All HTML injection sites already pass through `DOMPurify` **except**:

### 2a. `MFAEnrollDialog.tsx:181-184` — QR code SVG
Renders `enrollment.totp.qr_code` (raw SVG string from supabase auth) directly. Source is trusted (Supabase API), but if the response is ever spoofed via a compromised dependency or proxy, this is XSS.
- **Fix**: Sanitize with DOMPurify configured for SVG (`USE_PROFILES: { svg: true, svgFilters: true }`). No visible change.

### 2b. `SimpleMarkdown.tsx:17-20` — depends on `linkify`
Need to confirm `linkifyText` always returns sanitized HTML. If `linkify` ever passes through user-controlled `<` characters, this is XSS.
- **Fix**: Wrap output in `DOMPurify.sanitize(rendered, { ALLOWED_TAGS: ['a','br','strong','em'] })`. Safe even if linkify changes.

### 2c. `chart.tsx:78` — shadcn-generated CSS
This is a recharts theming pattern from shadcn. The values come from config we control, but it builds a `<style>` from interpolated strings. Add a comment + restrict to known color/CSS-variable formats so future contributors don't expand it carelessly.

## 3. `as any` schema casts pointing at real tables

Several queries cast tables to `any`:
- `site_alerts` (AlertBanner, AlertManager)
- `linkedin_imports` (linkedinImportService)
- `actorObject as any` in `actorService.ts` (JSON column — legitimate, leave a comment)

These tables exist in the DB but are missing from `types.ts`. The `as any` defeats the entire reason for typed Supabase. Fix by triggering a types regen so the casts can come out. Zero behavior change.

## 4. Tooling/defensive fixes

### 4a. Bare `useEffect` scroll listener allocates handler twice in StrictMode
`Navbar.tsx:89-99` adds a passive scroll listener but doesn't pass `{ passive: true }`. Mobile scroll perf hit on long pages.
- **Fix**: `addEventListener('scroll', handler, { passive: true })`.

### 4b. `AuthContext` 10-second loading timeout silently flips state
If `getSession()` hangs, we force `loading=false` after 10s and the user lands on a public page as if signed out. Better than infinite spinner, but should also surface via the existing `logger.error`.
- **Fix**: Replace `console.warn` with `logger.error` so production reports it. No UI change.

### 4c. `Auth.tsx` referral code lives forever in `localStorage`
`localStorage.setItem("referral_code", ref)` is only cleared on successful signup. If the user abandons signup, the code persists across all future sessions on that device.
- **Fix**: Add a 24h expiry stored alongside the code (`{code, expiresAt}` object). Behavior is identical for normal flows.

### 4d. `setTimeout` cleanups missing in 5 places
Searched 28 files; most clean up correctly. These don't:
- `PostComposer.tsx:75` — focus timeout, not cleared on unmount
- `MarkdownEditor.tsx:69` — focus restore, not cleared
- `ArticleEditor.tsx:128` — blur timeout, not cleared
- `CommentPreview.tsx:64,89` — scroll timeouts, not cleared
- `AuthCallback.tsx:81` — navigate timeout, not cleared

If the component unmounts before the timer fires, React warns and (in `AuthCallback`) you get a navigate-on-unmounted error.
- **Fix**: Capture handle, clear in cleanup.

## 5. Misc small risks

- **`ErrorBoundary.handleReload`** uses `window.location.reload()` — fine, but doesn't clear the error state if the user clicks reload but reload is blocked (rare). Add `setState` reset as fallback.
- **`SessionExpiryWarning`** stores `lastActivity` on every event. Throttle to once per 5s to cut writes.
- **`CompanyImageUpload.tsx:54`** swallows delete failures silently with `.catch(() => {})`. At least log via `logger.warn` so we know when stale assets accumulate.

## Out of scope (intentionally)
- Edge function audit, dead-code removal — separate PR per previous plan.
- Oversized file splits (ProfileEdit, messageService) — separate PR.
- `localStorage` → secure backend storage migration — architectural, not a bug.

## Execution order
1. Navbar moderation gate → use `useModerationAccess`
2. TipTap `window.__tiptapEditor` → forwardRef
3. MFA check ordering in `AuthContext` + cache-key scoping
4. Sanitize `MFAEnrollDialog` QR + `SimpleMarkdown` output
5. Trigger types regen, drop `as any` on `site_alerts` / `linkedin_imports`
6. `setTimeout` cleanups (5 files)
7. Passive scroll listener, `logger` swap, throttle, referral expiry
8. `tsc --noEmit` + manual smoke test on `/feed` and `/auth`

## What does NOT change
- No UI/UX changes, no routes, no features, no DB migrations, no edge function logic.
- All sanitized output already renders identically.
- Moderation access list is unchanged (still admin role + `is_moderator` RPC).

