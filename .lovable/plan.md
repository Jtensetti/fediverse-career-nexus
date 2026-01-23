
# Fix Events Display and Build Comprehensive Moderation System

## Overview

Three issues to resolve:
1. **Event pages crash/blank** - Field name mismatch between code and database schema
2. **Events not showing in upcoming list** - Same root cause as above
3. **Need extensive moderation tools** - Current page is ActivityPub-focused, not content moderation

---

## Issue 1 & 2: Events Display Fix

### Root Cause

The database uses different column names than the code expects:

| Database Column | Code Expects |
|-----------------|--------------|
| `start_date` | `start_time` |
| `end_date` | `end_time` |
| `cover_image_url` | `image_url` |
| `max_attendees` | `capacity` |
| `is_online` | `is_virtual` |
| `meeting_url` | `stream_url` |
| `visibility` | `is_public` |
| (none) | `stream_type`, `timezone` |

### Files to Fix

| File | Changes |
|------|---------|
| `src/services/eventService.ts` | Update `generateICalEvent()` to use correct column names (`start_date` instead of `start_time`, etc.) |
| `src/pages/EventView.tsx` | Update all field references to match database schema |
| `src/pages/Events.tsx` | Update `EventCard` component to use correct field names |

### Specific Changes

**EventView.tsx**:
- Change `parseISO(event.start_time)` to `parseISO(event.start_date)`
- Change `parseISO(event.end_time)` to `parseISO(event.end_date)`
- Change `event.image_url` to `event.cover_image_url`
- Change `event.is_virtual` to `event.is_online`
- Change `event.stream_url` to `event.meeting_url`
- Change `event.capacity` to `event.max_attendees`
- Change `event.is_public` to `event.visibility !== 'private'`
- Remove references to `event.timezone` (use browser timezone or UTC)
- Remove references to `event.stream_type` (determine from URL or remove embed logic)

**Events.tsx** (EventCard):
- Same column name updates

**eventService.ts**:
- Update `generateICalEvent()` function to use `event.start_date` and `event.end_date`
- Handle `event.is_online` instead of `event.is_virtual`
- Update `Event` interface to remove legacy field aliases (cleanup)

---

## Issue 3: Comprehensive Moderation Page

### Current State

The existing `/moderation` page focuses on:
- Moderation action log (warn/silence/block)
- Domain blocking for federation
- Actor blocking for federation  
- ActivityPub actor/object management
- Code of Conduct acceptance

### Missing Features (needed for fediverse community)

1. **Flagged Content Review** - View and act on reported posts/articles/users
2. **User Ban System** - Temporary and permanent bans with expiration
3. **Moderator Management** - Add/remove moderators (admin only)
4. **User Search** - Find users by username to take action
5. **Appeal Management** - Handle ban appeals
6. **Audit Trail** - Full history of moderation actions
7. **Bulk Actions** - Handle multiple reports efficiently

### Database Changes Required

```sql
-- User bans table (new)
CREATE TABLE public.user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL for permanent
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, created_at)
);

-- Add to moderation_actions for history
ALTER TABLE moderation_actions 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN target_content_type TEXT,
ADD COLUMN target_content_id TEXT;

-- RLS policies for bans table
CREATE POLICY "Moderators can view bans"
ON public.user_bans FOR SELECT
USING (is_moderator(auth.uid()));

CREATE POLICY "Moderators can create bans"
ON public.user_bans FOR INSERT
WITH CHECK (is_moderator(auth.uid()));

CREATE POLICY "Moderators can update bans"
ON public.user_bans FOR UPDATE
USING (is_moderator(auth.uid()));

-- Function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_banned(check_user_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_bans
    WHERE user_id = check_user_id
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### New Components to Create

1. **`src/components/moderation/FlaggedContentList.tsx`**
   - Displays content_reports with status = 'pending'
   - Shows preview of flagged content
   - Actions: Dismiss, Delete Content, Warn User, Ban User

2. **`src/components/moderation/UserBanDialog.tsx`**
   - Form for banning a user
   - Duration selector (1 day, 1 week, 1 month, permanent)
   - Reason field
   - Confirmation

3. **`src/components/moderation/BannedUsersList.tsx`**
   - Lists active bans
   - Shows expiration dates
   - Revoke ban action

4. **`src/components/moderation/ModeratorManagement.tsx`**
   - List current moderators (admin only)
   - Add new moderator by username
   - Remove moderator

5. **`src/components/moderation/UserLookup.tsx`**
   - Search for users by username
   - View user's moderation history
   - Quick action buttons

### Updated Moderation Page Structure

```tsx
<Tabs>
  <TabsTrigger value="reports">Reports ({pendingCount})</TabsTrigger>
  <TabsTrigger value="bans">User Bans</TabsTrigger>
  <TabsTrigger value="log">Action Log</TabsTrigger>
  <TabsTrigger value="moderators">Team</TabsTrigger>  {/* Admin only */}
  <TabsTrigger value="domains">Domains</TabsTrigger>
  <TabsTrigger value="actors">Actors</TabsTrigger>
  <TabsTrigger value="federation">Fediverse</TabsTrigger>
</Tabs>
```

### New Service Functions

**`src/services/moderationService.ts`** (new file):
```typescript
// Get flagged content with details
export async function getFlaggedContent(status = 'pending'): Promise<FlaggedItem[]>

// Update report status
export async function updateReportStatus(reportId: string, status: ReportStatus, action?: string): Promise<boolean>

// Ban a user
export async function banUser(userId: string, reason: string, durationDays?: number): Promise<boolean>

// Revoke a ban
export async function revokeBan(banId: string): Promise<boolean>

// Get active bans
export async function getActiveBans(): Promise<UserBan[]>

// Add moderator role
export async function addModerator(userId: string): Promise<boolean>

// Remove moderator role
export async function removeModerator(userId: string): Promise<boolean>

// Get moderators list
export async function getModerators(): Promise<Profile[]>

// Delete flagged content
export async function deleteFlaggedContent(contentType: string, contentId: string): Promise<boolean>
```

---

## Implementation Plan

### Phase 1: Fix Events (Critical - fixes blank page)
1. Update `src/pages/EventView.tsx` with correct field names
2. Update `src/pages/Events.tsx` with correct field names  
3. Update `src/services/eventService.ts` with correct field names and remove legacy aliases

### Phase 2: Database Setup for Moderation
1. Create migration for `user_bans` table
2. Add RLS policies
3. Create `is_user_banned()` function
4. Extend `moderation_actions` table

### Phase 3: Moderation Service Layer
1. Create `src/services/moderationService.ts`
2. Implement all CRUD operations for bans, reports, moderator management

### Phase 4: Moderation UI Components
1. Create `FlaggedContentList` component
2. Create `UserBanDialog` component
3. Create `BannedUsersList` component
4. Create `ModeratorManagement` component
5. Create `UserLookup` component

### Phase 5: Integrate into Moderation Page
1. Reorganize tabs for content-first approach
2. Add pending reports count badge
3. Integrate new components
4. Add user lookup/search functionality

---

## Fediverse-Friendly Features

The moderation system will support ActivityPub concepts:

1. **Federated Bans** - Option to notify other instances of banned actors
2. **Domain Defederation** - Already exists, integrates with moderation log
3. **Remote Actor Blocking** - Already exists, integrates with ban system
4. **Instance-Level Silencing** - Option to silence without full defederation
5. **Transparent Moderation Log** - Public moderation log option (fediverse best practice)
6. **Appeal via DM** - Users can appeal bans through direct message

---

## Files Summary

### To Modify
- `src/pages/EventView.tsx` - Fix column name references
- `src/pages/Events.tsx` - Fix column name references
- `src/services/eventService.ts` - Fix column names, clean up interface
- `src/pages/Moderation.tsx` - Reorganize with new tabs and components

### To Create
- `src/services/moderationService.ts` - New service for moderation operations
- `src/components/moderation/FlaggedContentList.tsx` - Flagged content viewer
- `src/components/moderation/UserBanDialog.tsx` - Ban user dialog
- `src/components/moderation/BannedUsersList.tsx` - Active bans list
- `src/components/moderation/ModeratorManagement.tsx` - Team management
- `src/components/moderation/UserLookup.tsx` - User search
- Database migration for `user_bans` table

### i18n Updates
- Add translation keys for new moderation features in `en.json` and `sv.json`
