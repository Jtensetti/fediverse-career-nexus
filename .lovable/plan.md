

# Fixes: Feed Freelancer Badge, Favicon, and OG Image

## Problem Summary

Three issues need to be resolved:
1. **Feed avatars don't show green "open to work" ring** - The avatar in posts doesn't display the freelancer badge
2. **Favicon uses Lovable heart** - The favicon points to an external URL instead of the project's icon
3. **OG image is plain teal** - The social share image is just "Nolto" on teal, not the actual homepage design

---

## Issue 1: Feed Avatars Missing Freelancer Badge

### Root Cause Analysis

The `FederatedPostCard` component uses a plain `Avatar` instead of `AvatarWithStatus`:

**Current code (lines 360-372):**
```tsx
<Avatar className="h-11 w-11 aspect-square flex-shrink-0 ring-2...">
  <AvatarImage src={...} />
  <AvatarFallback>...</AvatarFallback>
</Avatar>
```

Additionally, the feed data doesn't include freelancer status because:

1. The `FederatedPost.profile` interface only includes `username`, `fullname`, `avatar_url`, `home_instance`
2. The `getFederatedFeed` function in `federationService.ts` only fetches those 4 fields from `public_profiles`
3. The `public_profiles` view DOES have `is_freelancer` column - it just isn't being fetched

### Solution

**Step 1: Update FederatedPost interface** to include freelancer status:
```tsx
profile?: {
  username?: string;
  fullname?: string;
  avatar_url?: string;
  home_instance?: string;
  is_freelancer?: boolean;  // ADD THIS
};
```

**Step 2: Update getFederatedFeed query** to fetch `is_freelancer`:
```tsx
const { data: profiles } = await supabase
  .from('public_profiles')
  .select('id, username, fullname, avatar_url, home_instance, is_freelancer')  // ADD is_freelancer
  .in('id', userIds);
```

**Step 3: Include is_freelancer in profilesMap transformation**

**Step 4: Replace Avatar with AvatarWithStatus in FederatedPostCard:**
```tsx
import AvatarWithStatus from "@/components/common/AvatarWithStatus";

// In the render:
<AvatarWithStatus
  src={getAvatarUrl()}
  alt={getActorName()}
  fallback={getActorName().charAt(0).toUpperCase()}
  size="md"
  status={post.source === 'remote' ? 'remote' : 'none'}
  isFreelancer={post.profile?.is_freelancer}
/>
```

This removes the need for the separate "remote" globe badge div since `AvatarWithStatus` handles it automatically.

---

## Issue 2: Favicon Uses Lovable Heart

### Root Cause

The favicon in `index.html` (lines 23-27) points to an external Google Storage URL:
```html
<link
  rel="icon"
  type="image/png"
  href="https://storage.googleapis.com/gpt-engineer-file-uploads/hXPrdOqSYOSEXsgA2jxePGGKRT93/uploads/1767868098985-082a3beb-46f5-4b8a-9569-2da582063f92-removebg-preview.png"
/>
```

This is likely a placeholder that didn't get updated. The project has `public/favicon.ico` which should be used instead.

### Solution

Update the favicon link to use the local file:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

---

## Issue 3: OG Image is Plain Teal

### Root Cause

The current `public/og-image.png` is a simple graphic with just "Nolto" text on a teal background. This doesn't showcase the product effectively.

### Solution Options

**Option A: Create a professional OG image programmatically**
- Design a new image with the hero section content: "The Professional Network That Respects Your Freedom"
- Include the app screenshot mockup shown on the homepage
- Use the teal/green gradient background
- Standard size: 1200x630 pixels

**Option B: Use an existing asset**
- Check if the project has a marketing image in `public/lovable-uploads/`
- The file `8dbd04e2-165c-4205-ba34-e66173afac69.png` might be a logo or marketing asset

For a quick fix, I recommend creating a simple but effective OG image that includes:
- The tagline "The Professional Network That Respects Your Freedom"
- The Nolto logo
- A clean gradient background

This would require either:
1. User providing a new OG image file
2. Creating one programmatically with canvas/image generation

**Recommendation**: Ask the user if they have a marketing image to use, or if they want me to describe what the ideal OG image should look like so they can create it externally.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/services/federationService.ts` | Add `is_freelancer` to FederatedPost interface and query |
| `src/components/FederatedPostCard.tsx` | Replace Avatar with AvatarWithStatus component |
| `index.html` | Fix favicon to use local `/favicon.ico` |
| `public/og-image.png` | Needs new image (requires user input) |

---

## Implementation Details

### Fix 1A: federationService.ts - Update Interface

**Lines 12-18** - Add is_freelancer to profile type:
```tsx
profile?: {
  username?: string;
  fullname?: string;
  avatar_url?: string;
  home_instance?: string;
  is_freelancer?: boolean;
};
```

### Fix 1B: federationService.ts - Update Query

**Line 147** - Add is_freelancer to select:
```tsx
.select('id, username, fullname, avatar_url, home_instance, is_freelancer')
```

**Lines 153-155** - Include in profilesMap:
```tsx
profilesMap = Object.fromEntries(
  profiles.map(p => [p.id, { 
    username: p.username, 
    fullname: p.fullname, 
    avatar_url: p.avatar_url, 
    home_instance: p.home_instance,
    is_freelancer: p.is_freelancer 
  }])
);
```

**Line 179** - Add to profile object:
```tsx
profile: profile ? { 
  username: profile.username || undefined, 
  fullname: profile.fullname || undefined, 
  avatar_url: profile.avatar_url || undefined, 
  home_instance: profile.home_instance || undefined,
  is_freelancer: profile.is_freelancer || false
} : undefined,
```

### Fix 1C: FederatedPostCard.tsx - Replace Avatar

**Line 4** - Add import:
```tsx
import AvatarWithStatus from "@/components/common/AvatarWithStatus";
```

**Lines 360-378** - Replace Avatar with AvatarWithStatus:
```tsx
<AvatarWithStatus
  src={getAvatarUrl()}
  alt={getActorName()}
  fallback={getActorName().charAt(0).toUpperCase()}
  size="md"
  status={post.source === 'remote' ? 'remote' : 'none'}
  isFreelancer={post.source === 'local' && post.profile?.is_freelancer}
/>
```

This automatically handles:
- Green ring + briefcase icon for freelancers
- Purple ring + globe icon for remote/federated users
- Proper sizing and styling

### Fix 2: index.html - Favicon

**Lines 23-27** - Replace with:
```html
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

### Fix 3: OG Image

The current OG image is a simple teal graphic. For a professional social preview, the ideal image would be 1200x630 pixels and show:
- The main headline text
- A preview of the app interface
- The Nolto branding

This requires either a new image file to be uploaded, or we could create a simple text-based image with the key messaging.

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Feed avatars | Plain avatar, no freelancer indicator | Green ring + briefcase for "open to work" users |
| Favicon | Lovable heart icon | Nolto's custom favicon |
| OG image | Plain "Nolto" on teal | Needs new image |

---

## Question for User

For the OG image: Would you like to provide a new marketing image to use as the social share preview? The ideal size is 1200x630 pixels. Alternatively, I can create a simple image using the headline text and logo, though this would be basic. What would you prefer?

