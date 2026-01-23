
## Goal
Ensure browser tab titles update immediately on navigation across the entire app by standardizing all routes to use the existing `SEOHead` component (directly or via `DashboardLayout`), including Events + Articles which currently remain inconsistent.

## What I found (quick, relevant)
1) Several pages still don’t set any SEO/title metadata (no `SEOHead`, and not using `DashboardLayout`’s auto-SEO).
2) A few pages still use `react-helmet-async`’s `Helmet` directly; we should standardize those to `SEOHead` so behavior is consistent.
3) The `/events` page currently calls translation keys like `events.title`, `events.subtitle`, `events.upcoming`, etc. but many of those keys are missing in both `en.json` and `sv.json`. Even if we add `SEOHead`, using missing keys would produce bad titles (and potentially bad on-page text). This is directly related to “events titles don’t update correctly”.

## Implementation approach
### A) Standardize title/SEO handling (one consistent pattern)
We’ll set page titles in one of two ways:

1) **Pages using `DashboardLayout`**
   - Prefer passing `title` + `description` props to `DashboardLayout` so its auto-SEO kicks in:
     - This is already true for `Connections.tsx` (it passes `title` and `description`).
   - For pages already using `DashboardLayout` but missing titles (example: `PostView.tsx`), add `title`/`description` props there rather than adding `SEOHead` manually inside.

2) **Pages using `Navbar` + `Footer` directly (no DashboardLayout)**
   - Add `<SEOHead ... />` near the top of the page’s JSX.

### B) Pages to update (prioritized)
#### Highest impact (you explicitly noticed issues here)
- Events:
  - `src/pages/Events.tsx` (add `SEOHead`)
  - `src/pages/EventCreate.tsx` (add `SEOHead`)
  - `src/pages/EventEdit.tsx` (add `SEOHead`)
  - `src/pages/EventView.tsx` (add `SEOHead` with dynamic title from the event data)
- Articles:
  - `src/pages/Articles.tsx` (add `SEOHead`)
  - `src/pages/ArticleCreate.tsx` (add `SEOHead`)
  - `src/pages/ArticleEdit.tsx` (add `SEOHead`)
  - `src/pages/ArticleManage.tsx` (add `SEOHead`)

#### Other user-facing pages currently missing consistent SEO
- Starter packs:
  - `src/pages/StarterPacks.tsx` (add `SEOHead`)
  - `src/pages/StarterPackCreate.tsx` (add `SEOHead`)
  - `src/pages/StarterPackView.tsx` (add `SEOHead` with dynamic title from pack)
- Settings / moderation:
  - `src/pages/FeedSettings.tsx` (add `SEOHead`)
  - `src/pages/Moderation.tsx` (add `SEOHead`, probably `noindex` since it’s admin-like)
- Posts & messages:
  - `src/pages/PostView.tsx` (prefer `DashboardLayout title=...`)
  - `src/pages/MessageConversation.tsx` (add `SEOHead` like “Chat with {name}” or “Messages” fallback)
- Auth flows:
  - `src/pages/Auth.tsx` (add `SEOHead`; can vary title based on active tab/route path)
  - `src/pages/AuthCallback.tsx` (add `SEOHead` with `noindex`)
  - `src/pages/AuthRecovery.tsx` (add `SEOHead` with `noindex`)

#### Public informational pages (recommended for completeness)
These are public and currently have no title management:
- `src/pages/Mission.tsx`
- `src/pages/Documentation.tsx`
- `src/pages/HelpCenter.tsx`
- `src/pages/PrivacyPolicy.tsx`
- `src/pages/TermsOfService.tsx`
- `src/pages/NotFound.tsx`

Note: `src/pages/Home.tsx` likely doesn’t need SEO because it’s a redirect shell used by `Index.tsx` (which already has `SEOHead`).

### C) Replace direct Helmet usage with SEOHead (consistency)
Migrate these pages from `<Helmet>` to `<SEOHead>`:
- `src/pages/CodeOfConductPage.tsx`
- `src/pages/InstanceGuidelines.tsx`
- `src/pages/Instances.tsx`
- `src/pages/AdminInstances.tsx`
- `src/pages/AdminFederationMetrics.tsx`

### D) Fix missing i18n keys that will otherwise break titles (Events page especially)
Because `Events.tsx` currently uses keys that are missing (`events.title`, `events.subtitle`, `events.upcoming`, etc.), we should do one of the following (I recommend option 1):

1) **Add the missing keys** to both:
   - `src/i18n/locales/en.json`
   - `src/i18n/locales/sv.json`
   So both UI text and SEO titles are correct.

2) Alternatively, update `Events.tsx` to use existing keys (like `nav.events`) and/or provide fallback strings in `t("...", "Fallback")` calls. This avoids translation-file edits, but it’s less consistent long-term.

## Concrete code patterns (what will be applied)
### Static page
```tsx
import { SEOHead } from "@/components/common/SEOHead";

<SEOHead title="Events" description="Discover upcoming and past events on Nolto." />
```

### Dynamic page (EventView / StarterPackView)
```tsx
<SEOHead
  title={event?.title ? event.title : "Event"}
  description={event?.description?.slice(0, 160) || "View event details on Nolto."}
/>
```

### Admin/moderation pages (avoid indexing)
```tsx
<SEOHead title="Moderation" description="Moderation tools." noindex />
```

### DashboardLayout pages
```tsx
<DashboardLayout title="Post" description="View a post and its replies.">
  ...
</DashboardLayout>
```

## Verification checklist
1) Navigate in the SPA (no reload): Profile → Events → Articles → Starter Packs → Feed Settings → back.
   - Tab title must change on every navigation.
2) Open `EventView` and `ArticleView`:
   - Title should become the specific event/article title (or a sensible fallback while loading).
3) Open auth callback / recovery links:
   - Title set appropriately and page is `noindex`.
4) Confirm the `/events` page UI text (header + tabs) no longer shows raw i18n keys (if we add the missing translations).

## Scope / files expected to change (high-level)
- Multiple `src/pages/*.tsx` pages (as listed above)
- Potentially `src/i18n/locales/en.json` and `src/i18n/locales/sv.json` to add missing `events.*` keys (and any other missing keys we find during implementation)
- No backend changes needed

