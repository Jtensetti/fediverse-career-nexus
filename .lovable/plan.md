
# Fix: Post Editing and Freelancer Badge Issues

## Problem Summary

Two issues need to be resolved:
1. **Posts cannot be edited** - The Edit menu appears but clicking it does nothing
2. **Freelancer badge not showing** - Users marked as "Open for Work" don't see the green ring with briefcase icon

---

## Issue 1: Post Editing Not Working

### Root Cause Analysis

The "Edit" button in the dropdown menu triggers `handleEdit()`, which calls `onEdit(post)`. However, in two key locations, the `FederatedPostCard` component is rendered **without** the `onEdit` and `onDelete` callback props:

**Location 1: PostView.tsx (line 219)**
```tsx
<FederatedPostCard post={post} hideComments showFullContent />
// Missing: onEdit and onDelete handlers
```

**Location 2: UserPostsList.tsx (lines 44-67)**
```tsx
<FederatedPostCard
  key={post.id}
  post={{...}}
/>
// Missing: onEdit and onDelete handlers
```

This means the Edit menu item appears, but clicking it does nothing because `onEdit` is `undefined`.

### Solution

Add the necessary edit/delete handlers and dialog state to both components.

---

### Fix 1A: PostView.tsx

Add state for the edit dialog and handlers:

```tsx
// Add imports
import PostEditDialog from "@/components/PostEditDialog";
import { useQueryClient } from "@tanstack/react-query";

// Add state
const queryClient = useQueryClient();
const [editingPost, setEditingPost] = useState<FederatedPost | null>(null);
const [editOpen, setEditOpen] = useState(false);

// Add handlers
const handleEditPost = (post: FederatedPost) => {
  setEditingPost(post);
  setEditOpen(true);
};

const handleDeletePost = (postId: string) => {
  // Navigate back to feed after deletion
  navigate('/feed');
};

const handlePostUpdated = () => {
  loadPostWithReplies(); // Reload the post
  queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
};
```

Update the FederatedPostCard to pass handlers:
```tsx
<FederatedPostCard 
  post={post} 
  hideComments 
  showFullContent 
  onEdit={handleEditPost}
  onDelete={handleDeletePost}
/>
```

Add the edit dialog at the end:
```tsx
<PostEditDialog
  open={editOpen}
  onOpenChange={setEditOpen}
  post={editingPost}
  onUpdated={handlePostUpdated}
/>
```

---

### Fix 1B: UserPostsList.tsx

Add state for the edit dialog and handlers:

```tsx
// Add imports
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import PostEditDialog from "./PostEditDialog";

// Add state inside component
const queryClient = useQueryClient();
const [editingPost, setEditingPost] = useState<any>(null);
const [editOpen, setEditOpen] = useState(false);

// Add handlers
const handleEditPost = (post: any) => {
  setEditingPost(post);
  setEditOpen(true);
};

const handleDeletePost = (postId: string) => {
  queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
  refetch();
};

const handlePostUpdated = () => {
  queryClient.invalidateQueries({ queryKey: ['userPosts', userId] });
  queryClient.invalidateQueries({ queryKey: ['federatedFeed'] });
  refetch();
};
```

Update the FederatedPostCard to pass handlers:
```tsx
<FederatedPostCard
  key={post.id}
  post={{...}}
  onEdit={handleEditPost}
  onDelete={handleDeletePost}
/>
```

Add the edit dialog at the end:
```tsx
<PostEditDialog
  open={editOpen}
  onOpenChange={setEditOpen}
  post={editingPost}
  onUpdated={handlePostUpdated}
/>
```

---

## Issue 2: Freelancer Badge Not Showing

### Root Cause Analysis

Database verification confirms the user has `is_freelancer: true`:
```sql
SELECT is_freelancer FROM profiles WHERE id = '02714eb1-...';
-- Result: is_freelancer: true
```

However, the badge doesn't appear because of a **missing field** in `getCurrentUserProfile()`:

**File: src/services/profileService.ts (lines 314-362)**

The `getCurrentUserProfile` function builds a `userProfile` object but **omits** the `isFreelancer` field entirely:

```tsx
const userProfile = {
  id: profile.id,
  username: profile.username,
  displayName: profile.fullname,
  headline: profile.headline,
  bio: profile.bio,
  avatarUrl: profile.avatar_url,
  // ... many fields ...
  contact: {...},
  experience: [...],
  education: [...],
  skills: [...],
  // ❌ MISSING: isFreelancer, freelancerSkills, freelancerRate, freelancerAvailability
};
```

In contrast, `getUserProfileByUsername` (lines 474-478) correctly includes:
```tsx
isFreelancer: (profile as any).is_freelancer || false,
freelancerSkills: (profile as any).freelancer_skills || [],
freelancerRate: (profile as any).freelancer_rate || undefined,
freelancerAvailability: (profile as any).freelancer_availability || undefined,
```

### Solution

Add the missing freelancer fields to `getCurrentUserProfile()`.

---

### Fix 2: profileService.ts

In the `getCurrentUserProfile` function, add the freelancer fields to the returned `userProfile` object (around line 331, after the federated auth fields):

```tsx
const userProfile = {
  // ... existing fields ...
  authType: (profile.auth_type as "local" | "federated") || "local",
  homeInstance: profile.home_instance || undefined,
  remoteActorUrl: profile.remote_actor_url || undefined,
  // ADD THESE FREELANCER FIELDS:
  isFreelancer: profile.is_freelancer || false,
  freelancerSkills: profile.freelancer_skills || [],
  freelancerRate: profile.freelancer_rate || undefined,
  freelancerAvailability: profile.freelancer_availability || undefined,
  website: profile.website || undefined,
  contactEmail: profile.public_email || undefined,
  // ... existing contact, experience, education, skills ...
};
```

---

## Files to Modify

| File | Change | Lines |
|------|--------|-------|
| `src/pages/PostView.tsx` | Add edit dialog state, handlers, and pass `onEdit`/`onDelete` to `FederatedPostCard` | 1-260 |
| `src/components/UserPostsList.tsx` | Add edit dialog state, handlers, and pass `onEdit`/`onDelete` to `FederatedPostCard` | 1-71 |
| `src/services/profileService.ts` | Add `isFreelancer`, `freelancerSkills`, `freelancerRate`, `freelancerAvailability`, `website`, `contactEmail` fields to `getCurrentUserProfile()` return object | 314-362 |

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Edit posts from PostView | Click "Edit" → nothing happens | Click "Edit" → edit dialog opens, saves work |
| Edit posts from Profile tab | Click "Edit" → nothing happens | Click "Edit" → edit dialog opens, saves work |
| Freelancer badge | No green ring on profile avatar | Green ring with briefcase icon when "Open for Work" is enabled |

---

## Technical Notes

- The `AvatarWithStatus` component already has correct logic for displaying the freelancer badge via the `isFreelancer` prop and `effectiveStatus` computation
- The `Profile.tsx` page already passes `isFreelancer={profile.isFreelancer}` to both `AvatarWithStatus` instances (fixed in previous update)
- The database schema and data are correct - this is purely a frontend data-passing issue
