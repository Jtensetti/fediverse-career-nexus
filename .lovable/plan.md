
# Comprehensive Plan: Freelancer Features, Profile Improvements, and Bug Fixes

## Overview

This plan addresses 6 tickets covering new freelancer features, profile enhancements, and critical bug fixes. The changes are designed to be additive and non-destructive to existing functionality.

---

## Ticket 1: Freelancer Features

### 1.1 Database Changes

Add new columns to `profiles` table:
- `is_freelancer` (boolean, default false) - Marks user as available for work
- `freelancer_skills` (text array) - Skills for freelancer search
- `freelancer_rate` (text, optional) - Hourly/daily rate display
- `freelancer_availability` (text, optional) - "Full-time", "Part-time", "Project-based"

### 1.2 Profile Badge (LinkedIn-style frame)

Create `FreelancerBadge` component that wraps the avatar with a green gradient ring when `is_freelancer` is true. Update `AvatarWithStatus` component to accept an `isFreelancer` prop.

### 1.3 Freelancer Toggle in Profile Edit

Add a new section in the Privacy tab or create a dedicated "Freelance" tab:
- Toggle switch for "Open for work"
- Multi-select for skills (searchable)
- Optional rate field
- Availability dropdown
- Prompt suggesting to "Open DMs to freelance inquiries" when enabled

### 1.4 Freelancer Discovery Page

Create `/freelancers` page with:
- Skill/keyword search input
- Filter by location (optional)
- Grid of freelancer cards showing: avatar (with badge), name, headline, skills, website preview, bio excerpt
- Link each card to profile
- Use existing `advancedSearchService` pattern with new `searchFreelancers` method

### 1.5 DM Suggestion

When user enables freelancer mode, show a toast or inline prompt: "Consider opening your DMs so potential clients can reach you directly" with a link to DM privacy settings.

---

## Ticket 2: Contact Information Improvements

### 2.1 Database Changes

Add to `profiles` table:
- `website` (text) - Primary professional website
- `public_email` (text, optional) - Public contact email (different from auth email)
- `show_email` (boolean, default false) - Whether to display email publicly

Add to `user_settings` table:
- `email_visibility` (text, default 'hidden') - Options: 'hidden', 'auth_email', 'public_email'

### 2.2 Profile Edit UI Updates

**Contact Information section changes:**
- Email field: Add clarifying text: "This is your account email and is never shown publicly."
- New toggle: "Show a contact email on my profile"
- When enabled, show radio options:
  - "Use my account email" (shows current email)
  - "Use a different email" (reveals input for public_email)
- New Website field with URL validation
- Consider adding "Additional Links" section for blog/social (optional, lower priority)

### 2.3 Profile Display

Update `Profile.tsx` to show:
- Website link prominently (with external link icon)
- Contact email (if user opted in) in the contact section

---

## Ticket 3: Profile Views - Always On

### 3.1 Remove Toggle Option

- Delete `ProfileVisitsToggle` component from ProfileEdit privacy tab
- Remove `show_network_connections` setting usage for profile views (keep column for other uses if needed)
- Profile views are now always tracked and always visible to profile owner

### 3.2 UI Update

Replace the toggle with static explanatory text: "Profile view statistics are always visible to you. Other users cannot see who viewed their profile."

---

## Ticket 4: Education Verification - Remove Incomplete Feature

### 4.1 Remove from Education UI

In `ProfileEdit.tsx` education tab:
- Remove `VerificationBadge` display for education entries
- Remove `VerificationRequest` button for education entries
- Keep experience verification as-is (it has URL-based verification)

### 4.2 Optional: Database Cleanup

Consider removing `verification_token` and `verification_status` columns from `education` table, or leave them for potential future use.

---

## Ticket 5: Posts Losing Line Breaks and Images

### 5.1 Fix Line Breaks Display

In `FederatedPostCard.tsx`, update the content rendering div to preserve whitespace:

```tsx
// Change from:
<div className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:break-all">

// To:
<div className="prose prose-sm max-w-none dark:prose-invert [&_a]:text-primary [&_a]:break-all whitespace-pre-line">
```

### 5.2 Fix Image Attachments

**Problem**: Images are stored in `attachment` array but `getMediaAttachments()` filters by `mediaType` which may not be set for local uploads.

**Fix in `FederatedPostCard.tsx`**:
```tsx
const getMediaAttachments = () => {
  const attachments = 
    post.content.attachment || 
    post.content.object?.attachment ||
    [];
  
  if (!Array.isArray(attachments)) return [];
  
  return attachments.filter(att => {
    // Accept if mediaType starts with image/ OR if type is 'Image'
    const isImage = (att.mediaType && att.mediaType.startsWith('image/')) || 
                    att.type === 'Image';
    return isImage && att.url;
  }).map(att => ({
    ...att,
    altText: att.name || ''
  }));
};
```

**Fix in `postService.ts`** (line 205-209): Add `mediaType` when creating attachment:
```tsx
attachment: imageUrl ? [{
  type: 'Image',
  mediaType: 'image/jpeg', // Or detect from file
  url: imageUrl,
  name: postData.imageAltText || ''
}] : undefined,
```

---

## Ticket 6: Post Edit Feature Not Working

### 6.1 Fix Content Extraction

In `PostEditDialog.tsx`, improve content extraction to handle more cases and preserve line breaks:

```tsx
useEffect(() => {
  if (post) {
    let text = "";
    
    // Try different content locations
    if (post.type === 'Create' && post.content.object?.content) {
      text = post.content.object.content;
    } else if (post.content.content) {
      text = post.content.content;
    }
    
    // Convert HTML line breaks to newlines before stripping tags
    text = text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    setContent(text);
  }
}, [post]);
```

### 6.2 Verify Update Service

The `updatePost` function in `postService.ts` looks correct. Add console logging to debug if issues persist. The function handles:
- Create activity with nested object
- Question (poll) type
- Direct Note type

---

## Implementation Order

| Priority | Ticket | Effort |
|----------|--------|--------|
| 1 | Ticket 5 - Line breaks & images | Small - Quick fixes |
| 2 | Ticket 6 - Post edit | Small - Quick fix |
| 3 | Ticket 4 - Remove education verification | Small - Remove code |
| 4 | Ticket 3 - Profile views always on | Small - Remove toggle |
| 5 | Ticket 2 - Contact info improvements | Medium - DB + UI |
| 6 | Ticket 1 - Freelancer features | Large - Full feature |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/FederatedPostCard.tsx` | Add `whitespace-pre-line`, fix image detection |
| `src/services/postService.ts` | Add `mediaType` to attachments |
| `src/components/PostEditDialog.tsx` | Fix content extraction |
| `src/pages/ProfileEdit.tsx` | Remove education verification, add freelancer/contact fields |
| `src/pages/Profile.tsx` | Display website, freelancer badge |
| `src/components/ProfileVisitsToggle.tsx` | Replace with static text |
| `src/components/common/AvatarWithStatus.tsx` | Add freelancer ring option |

## New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Freelancers.tsx` | Freelancer discovery page |
| `src/components/FreelancerBadge.tsx` | Avatar ring indicator |
| `src/services/freelancerService.ts` | Search and filter freelancers |

## Database Migration

```sql
-- Profiles table additions
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_freelancer BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS freelancer_skills TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS freelancer_rate TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS freelancer_availability TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_email TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false;

-- Update public_profiles view to include new fields
-- Index for freelancer search
CREATE INDEX IF NOT EXISTS idx_profiles_freelancer ON profiles(is_freelancer) WHERE is_freelancer = true;
```
