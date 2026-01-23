

# Fixes: OG Image Mismatch and Freelancer Badge Not Showing

## Issue 1: OG Image Preview Looking Weird

### Root Cause Analysis

The `index.html` has **inconsistent OG image references**:

```html
<!-- Line 16: OpenGraph uses external Lovable default image -->
<meta property="og:image" content="https://lovable.dev/opengraph-image-p98pqg.png" />

<!-- Line 21: Twitter uses local image (correct one) -->
<meta name="twitter:image" content="/og-image.png" />
```

The **problem**: 
1. `og:image` points to `https://lovable.dev/opengraph-image-p98pqg.png` - a generic Lovable placeholder
2. `twitter:image` uses `/og-image.png` - the correct Nolto branded image (the nice blue gradient with "Nolto" text)
3. The relative path `/og-image.png` for Twitter may not resolve correctly on all platforms

### Solution

1. Update both `og:image` and `twitter:image` to use the **full absolute URL** to the local Nolto OG image
2. The local `/public/og-image.png` already exists and has the proper 1200x630 aspect ratio (standard for social cards)

```html
<meta property="og:image" content="https://fediverse-career.lovable.app/og-image.png" />
<meta name="twitter:image" content="https://fediverse-career.lovable.app/og-image.png" />
```

---

## Issue 2: Freelancer Badge Not Showing

### Root Cause Analysis

**The Bug Location**: `src/pages/Profile.tsx` line 311 combined with `src/components/common/AvatarWithStatus.tsx` line 60

**Profile.tsx (line 311)**:
```tsx
const avatarStatus = profile.isVerified ? "verified" : profile.authType === "federated" ? "remote" : "none";
```

**AvatarWithStatus.tsx (line 60)**:
```tsx
const effectiveStatus = isFreelancer && status === "none" ? "freelancer" : status;
```

**The Problem**:
- The user `jtensetti_mastodon` has `authType === "federated"`, so `avatarStatus = "remote"`
- The freelancer badge logic only triggers when `status === "none"`
- This means **federated users** and **verified users** can NEVER see the freelancer badge, even if `is_freelancer = true`

### Database Confirmation

```sql
SELECT is_freelancer, auth_type FROM profiles WHERE username = 'jtensetti_mastodon';
-- Result: is_freelancer: true, auth_type: federated
```

The data is correct - the issue is purely in the UI logic.

### Solution

Modify `AvatarWithStatus.tsx` to **prioritize the freelancer badge** when the user is marked as open for work. The freelancer status should override "none" and potentially coexist with or take precedence over other statuses.

**New Logic**:
```tsx
// Priority: freelancer > verified > remote > admin > online > none
const effectiveStatus = isFreelancer ? "freelancer" : status;
```

This change means:
- If a user is "open for work", they ALWAYS get the green freelancer badge with the briefcase icon
- This takes priority over "remote" (purple globe) and "none"
- Verified status could optionally still be shown, but the freelancer badge provides clearer professional intent

**Alternative approach** (show both indicators):
Keep the ring color based on status (verified/remote) but always show the freelancer badge icon when applicable. This requires more UI changes but preserves both indicators.

For simplicity, I recommend **prioritizing the freelancer badge** since "open for work" is a deliberate professional choice by the user and is more actionable information for viewers.

---

## Files to Modify

| File | Change |
|------|--------|
| `index.html` | Update `og:image` and `twitter:image` to use absolute URL to local OG image |
| `src/components/common/AvatarWithStatus.tsx` | Change effectiveStatus logic to prioritize freelancer status |

---

## Implementation Details

### Fix 1: OG Image (index.html)

**Lines 16 and 21** - Update to:

```html
<meta property="og:image" content="https://fediverse-career.lovable.app/og-image.png" />
<!-- ... -->
<meta name="twitter:image" content="https://fediverse-career.lovable.app/og-image.png" />
```

This ensures:
- All social platforms (LinkedIn, Facebook, Twitter, Mastodon, Slack, Discord) see the same professional Nolto branded image
- The absolute URL works regardless of how the link is shared
- The existing `og-image.png` has the correct 1200x630 dimensions for optimal display

### Fix 2: Freelancer Badge (AvatarWithStatus.tsx)

**Line 60** - Change from:

```tsx
const effectiveStatus = isFreelancer && status === "none" ? "freelancer" : status;
```

To:

```tsx
// Freelancer status takes priority to clearly show "open for work"
const effectiveStatus = isFreelancer ? "freelancer" : status;
```

This ensures:
- Users who toggle "Open for Work" will ALWAYS see the green ring with briefcase icon
- This works for local users, federated users, and verified users alike
- The professional signal is consistently visible

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| OG Image on LinkedIn/Facebook | Shows generic Lovable placeholder or broken image | Shows professional Nolto branded image |
| OG Image on Twitter/X | May show correct image (relative path) | Consistently shows correct absolute URL |
| Freelancer badge (local user) | Shows green badge when no other status | Shows green badge always |
| Freelancer badge (federated user) | Never shows (purple "remote" badge wins) | Shows green freelancer badge |
| Freelancer badge (verified user) | Never shows (blue "verified" badge wins) | Shows green freelancer badge |

---

## Testing Checklist

After implementation:
1. Share the homepage link on LinkedIn, Facebook, Twitter - verify the Nolto branded image appears
2. Toggle "Open for Work" on a federated user's profile - verify green badge appears
3. Toggle "Open for Work" on a verified user's profile - verify green badge appears
4. Disable "Open for Work" - verify badge reverts to previous status (verified/remote/none)

