

# Fix: Browser Tab Title Not Updating on Page Navigation

## Problem Summary

When navigating away from a profile page, the browser tab title remains stuck on the profile name (e.g., "John Doe (@johndoe) | Nolto") instead of updating to reflect the current page. This happens because most pages in the application are **missing the `SEOHead` component** to set their own titles.

---

## Root Cause Analysis

### How React Helmet Works

`react-helmet-async` manages the document `<title>` declaratively. When you navigate from Page A (with SEOHead) to Page B (without SEOHead):
- Page A's `<Helmet>` component is unmounted
- **But no new `<Helmet>` component replaces it**, so the title persists

### Current State

| Page | Has SEOHead? | Result |
|------|-------------|--------|
| Profile.tsx | Yes - sets `"${displayName} (@${username}) \| Nolto"` | Title updates correctly |
| Index.tsx | Yes - sets `"Nolto - The Federated Professional Network"` | Only for unauthenticated users |
| **FederatedFeed.tsx** | **No** | Title stays as previous page |
| Messages.tsx | No | Title stays as previous page |
| Notifications.tsx | No | Title stays as previous page |
| Jobs.tsx | No | Title stays as previous page |
| Articles.tsx | No | Title stays as previous page |
| ... (40+ more pages) | No | Title stays as previous page |

### The Specific Bug Path

1. User visits `/profile/johndoe` → Title becomes "John Doe (@johndoe) | Nolto"
2. User navigates to `/feed` (home) → **FederatedFeed.tsx has no SEOHead**
3. Browser tab still shows "John Doe (@johndoe) | Nolto" ❌

---

## Solution

Add `SEOHead` component to all pages that render visible content. This ensures:
1. Every page sets its own title
2. Social sharing from any page has correct meta tags
3. The title always reflects the current page

---

## Implementation Details

### Priority 1: Most Frequently Used Pages

These are the pages users navigate to most often and will notice the bug immediately:

| File | Title to Set |
|------|-------------|
| `src/pages/FederatedFeed.tsx` | "Feed \| Nolto" |
| `src/pages/Messages.tsx` | "Messages \| Nolto" |
| `src/pages/Notifications.tsx` | "Notifications \| Nolto" |
| `src/pages/Connections.tsx` | "Connections \| Nolto" |
| `src/pages/SavedItems.tsx` | "Saved Items \| Nolto" |
| `src/pages/ProfileEdit.tsx` | "Edit Profile \| Nolto" |

### Priority 2: Content Pages

| File | Title to Set |
|------|-------------|
| `src/pages/Jobs.tsx` | "Jobs \| Nolto" |
| `src/pages/JobView.tsx` | Dynamic: "{job.title} \| Nolto" |
| `src/pages/JobCreate.tsx` | "Create Job Post \| Nolto" |
| `src/pages/JobEdit.tsx` | "Edit Job Post \| Nolto" |
| `src/pages/JobManage.tsx` | "Manage Jobs \| Nolto" |
| `src/pages/Articles.tsx` | "Articles \| Nolto" |
| `src/pages/ArticleCreate.tsx` | "Write Article \| Nolto" |
| `src/pages/ArticleEdit.tsx` | "Edit Article \| Nolto" |
| `src/pages/ArticleManage.tsx` | "Manage Articles \| Nolto" |
| `src/pages/PostView.tsx` | Dynamic: post preview or "Post \| Nolto" |

### Priority 3: Events & Other Features

| File | Title to Set |
|------|-------------|
| `src/pages/Events.tsx` | "Events \| Nolto" |
| `src/pages/EventCreate.tsx` | "Create Event \| Nolto" |
| `src/pages/EventEdit.tsx` | "Edit Event \| Nolto" |
| `src/pages/EventView.tsx` | Dynamic: "{event.title} \| Nolto" |
| `src/pages/Freelancers.tsx` | "Freelancers \| Nolto" |
| `src/pages/Search.tsx` | "Search \| Nolto" |
| `src/pages/FeedSettings.tsx` | "Feed Settings \| Nolto" |
| `src/pages/StarterPacks.tsx` | "Starter Packs \| Nolto" |
| `src/pages/StarterPackView.tsx` | Dynamic: "{pack.name} \| Nolto" |
| `src/pages/StarterPackCreate.tsx` | "Create Starter Pack \| Nolto" |

### Priority 4: Static/Info Pages

| File | Title to Set |
|------|-------------|
| `src/pages/Mission.tsx` | "Our Mission \| Nolto" |
| `src/pages/Documentation.tsx` | "Documentation \| Nolto" |
| `src/pages/FederationGuide.tsx` | "Federation Guide \| Nolto" |
| `src/pages/HelpCenter.tsx` | "Help Center \| Nolto" |
| `src/pages/PrivacyPolicy.tsx` | "Privacy Policy \| Nolto" |
| `src/pages/TermsOfService.tsx` | "Terms of Service \| Nolto" |
| `src/pages/Instances.tsx` | "Instances \| Nolto" |
| `src/pages/NotFound.tsx` | "Page Not Found \| Nolto" |

### Priority 5: Auth & Admin Pages

| File | Title to Set |
|------|-------------|
| `src/pages/Auth.tsx` | "Sign In \| Nolto" |
| `src/pages/AuthRecovery.tsx` | "Reset Password \| Nolto" |
| `src/pages/ConfirmEmail.tsx` | "Confirm Email \| Nolto" |
| `src/pages/Moderation.tsx` | "Moderation \| Nolto" |
| `src/pages/AdminFederationHealth.tsx` | "Federation Health \| Nolto" |
| `src/pages/AdminFederationMetrics.tsx` | "Federation Metrics \| Nolto" |
| `src/pages/AdminInstances.tsx` | "Manage Instances \| Nolto" |
| `src/pages/MessageConversation.tsx` | Dynamic: "Chat with {name} \| Nolto" |

---

## Code Pattern

Each page will add the SEOHead component like this:

```tsx
import { SEOHead } from "@/components/common/SEOHead";

// In the component return:
<>
  <SEOHead title="Page Title" />
  {/* existing page content */}
</>
```

For dynamic titles (like job details):

```tsx
<SEOHead 
  title={job?.title || "Job Details"}
  description={job?.description?.slice(0, 160)}
/>
```

---

## Files to Modify

A total of **~35 files** need to be updated. The implementation will:

1. Add `import { SEOHead } from "@/components/common/SEOHead";` to each file
2. Add `<SEOHead title="..." />` at the top of the returned JSX
3. For pages using `Helmet` directly (like CodeOfConductPage), replace with `SEOHead` for consistency

---

## Expected Outcomes

| Scenario | Before | After |
|----------|--------|-------|
| Visit profile, then go to feed | Tab shows "John Doe (@johndoe) \| Nolto" | Tab shows "Feed \| Nolto" |
| Navigate to messages | Title unchanged | Tab shows "Messages \| Nolto" |
| View a job posting | Title unchanged | Tab shows "Senior Developer at Acme \| Nolto" |
| Share feed on social media | Inconsistent meta tags | Proper "Feed \| Nolto" with correct OG tags |

---

## Note on Profile Sharing

The profile sharing functionality continues to work correctly because:
- `Profile.tsx` already sets proper SEO meta tags via `SEOHead`
- The `ShareProfileCard` component uses `window.location.origin` for dynamic URLs
- The OG image and description are set per-profile for social previews

This fix ensures that after viewing a shared profile URL, navigating away will properly update the tab title.

