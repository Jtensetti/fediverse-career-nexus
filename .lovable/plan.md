

# Spring Clean: Codebase & Database Cleanup

## Problem
88 database tables, ~50 edge functions, and hundreds of component files have accumulated. Several tables, columns, files, pages, and edge functions are no longer referenced or serve no purpose. This makes the project harder to navigate for open-source contributors.

---

## A. Dead Files to Delete

### Components (unused — no imports anywhere)
| File | Reason |
|------|--------|
| `src/components/Hero.tsx` | Replaced by `HeroWithScreenshot`, zero imports |
| `src/components/UnauthenticatedHomepage.tsx` | Shim re-export; update the one import in `Index.tsx` to point directly to `homepage/UnauthenticatedHomepage` |
| `src/components/common/EnhancedReactions.tsx` | Zero imports outside its own file + barrel |
| `src/components/common/FloatingActionButton.tsx` | Zero imports |
| `src/components/common/FocusRing.tsx` | Zero imports |
| `src/components/common/AnimatedButton.tsx` | Zero imports |
| `src/components/common/AnimatedCard.tsx` | Zero imports |
| `src/components/common/skeletons/ArticleCardSkeleton.tsx` | Zero imports |
| `src/components/common/skeletons/ProfileSkeleton.tsx` | Zero imports |
| `src/components/feed/FeedEmptyState.tsx` | Zero imports (entire `feed/` folder can go) |
| `src/components/homepage/Testimonials.tsx` | Replaced by `EnhancedTestimonials`, zero imports |
| `src/components/homepage/FeatureShowcase.tsx` | Zero imports |
| `src/components/homepage/MobilePreview.tsx` | Zero imports |
| `src/components/homepage/WhyFederated.tsx` | Zero imports |
| `src/components/homepage/BuiltInOpen.tsx` | Zero imports |
| `src/components/homepage/FederationExplainer.tsx` | Zero imports |
| `src/components/homepage/EnhancedTestimonials.tsx` | Zero imports |

### Pages (unused — no route in App.tsx)
| File | Reason |
|------|--------|
| `src/pages/Moderation.tsx` | Replaced by `ModerationDashboard.tsx`; no route, no import |
| `src/pages/federation/ActorInbox.tsx` | No route in App.tsx |
| `src/pages/federation/ActorOutbox.tsx` | No route in App.tsx |
| `src/pages/federation/ActorProfile.tsx` | No route in App.tsx |
| `src/pages/federation/AdminFederationMetrics.tsx` | No route in App.tsx |

### Edge Functions (unused or one-time migration)
| Function | Reason |
|----------|--------|
| `supabase/functions/migrate-legacy-messages/` | One-time migration script, no frontend calls |
| `supabase/functions/create-jitsi-meeting/` | Zero references in frontend |
| `supabase/functions/cloudflare/` | Contains a `cloudflare-worker.ts` — not a Supabase edge function, zero references |
| `supabase/functions/fix-security-invoker/` | One-time admin utility, consider removing after confirming it's been run |

---

## B. Database Tables to Drop (unused)

These tables exist in the database but have **zero references** in the frontend codebase and no/minimal edge function usage:

| Table | Reason |
|-------|--------|
| `achievements` | Zero frontend references; gamification never shipped |
| `user_achievements` | Same — depends on `achievements` |
| `cross_post_settings` | Zero references anywhere; cross-posting feature never built |
| `event_attendees` | Only referenced in `export-user-data`; duplicate of `event_rsvps` which is the one actually used |
| `post_reactions` | Zero frontend references; replaced by the generic `reactions` table |
| `post_boosts` | Zero frontend references; boosts are handled via `ap_objects` type=Announce |
| `security_incidents` | Zero references outside types.ts; incident tracking never implemented |
| `user_cw_preferences` | Zero frontend references; content warning preferences never wired up |

### Database Columns to Consider Dropping (profiles table)
| Column | Reason |
|--------|--------|
| `profiles.public_email` | Zero references; `contact_email` is used instead |
| `profiles.show_email` | Zero references; visibility is controlled by view |
| `profiles.trust_level` | Zero references; never implemented |

### Database Function to Drop
| Function | Reason |
|----------|--------|
| `exec_sql(sql text)` | **Security risk** — allows arbitrary SQL execution. Zero frontend usage. Should be dropped immediately. |

---

## C. Barrel Export Cleanup

Update these `index.ts` files to remove exports of deleted files:
- `src/components/common/index.ts` — remove `EnhancedReactions`, `FocusRing`, `AnimatedButton`, `AnimatedCard`
- `src/components/common/skeletons/index.ts` — remove `ArticleCardSkeleton`, `ProfileSkeleton`
- `src/pages/federation/index.ts` — remove `ActorInbox`, `ActorOutbox`, `ActorProfile`, `AdminFederationMetrics`

---

## D. Import Path Cleanup

- `src/pages/Index.tsx`: Change import from `@/components/UnauthenticatedHomepage` → `@/components/homepage/UnauthenticatedHomepage`
- `src/App.tsx` line 53: Change `InstanceGuidelinesPage` import from `./components/legal/InstanceGuidelines` → `./pages/legal/InstanceGuidelines` (it imports a component where a page should be)

---

## E. Scope & Safety

- **Zero logic changes** — no behavior, UI, or design modifications
- **Database migrations** for dropping tables/columns/functions (reversible with backups)
- **Edge function deletions** are permanent but all are confirmed unused
- File deletions are tracked in git history

---

## Execution Order
1. Database migration: drop `exec_sql` function (security priority)
2. Database migration: drop unused tables and columns
3. Delete dead component/page/edge-function files
4. Update barrel exports and import paths
5. Verify build passes (`tsc --noEmit` + `vite build`)

