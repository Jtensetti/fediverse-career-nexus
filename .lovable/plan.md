
# Profile Stats Redesign Plan

## Overview
Update the profile page to display user statistics (posts, following, followers) in a Mastodon-style layout with large bold numbers and small labels beneath, positioned to the right of the avatar below the header image.

## Design Reference
Based on the Mastodon screenshot provided:
- Three columns of stats displayed horizontally
- Large bold numbers (similar size to ProfileViewsWidget: `text-2xl font-bold`)
- Small muted labels below each number
- Positioned to the right of the avatar, below the header/banner area

## Implementation Steps

### 1. Update ProfileStats Component
**File: `src/components/profile/ProfileStats.tsx`**

Modify the component to:
- Add `following` count to the `StatsData` interface
- Update `fetchProfileStats` to return `following` count (already calculated internally, just needs to be returned)
- Create a new Mastodon-style `StatItem` layout with vertical orientation:
  - Large bold number on top (`text-2xl font-bold`)
  - Small muted label below (`text-sm text-muted-foreground`)
- Remove icons for cleaner appearance matching the reference
- Display three stats: **posts**, **following**, **followers**

### 2. Update Profile Page Layout
**File: `src/pages/Profile.tsx`**

Modify the profile header section:
- Uncomment and reposition the `ProfileStats` component
- Place it to the right of the avatar, aligned at the bottom of the avatar
- On desktop: Stats appear horizontally next to avatar
- On mobile: Stats appear below the avatar in a horizontal row

## Technical Details

### Updated StatsData Interface
```typescript
interface StatsData {
  posts: number;
  following: number;
  followers: number;
}
```

### New StatItem Component (Mastodon-style)
```tsx
const StatItem = ({ value, label, isLoading }: { 
  value: number; 
  label: string;
  isLoading: boolean;
}) => (
  <div className="text-center">
    {isLoading ? (
      <Skeleton className="h-7 w-12 mx-auto" />
    ) : (
      <span className="text-2xl font-bold">{value.toLocaleString()}</span>
    )}
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);
```

### Profile Layout Changes
Position the stats in the avatar row (lines 395-418):
```tsx
<div className="flex flex-col md:flex-row md:items-end gap-4 -mt-16 md:-mt-20">
  <div className="flex items-end gap-6">
    {/* Avatar */}
    <motion.div ... >
      <AvatarWithStatus ... />
    </motion.div>

    {/* Stats next to avatar - visible */}
    <div className="hidden md:flex items-end gap-6 pb-2">
      <ProfileStats userId={profile.id} />
    </div>
  </div>
  
  {/* Action buttons on right */}
  ...
</div>

{/* Mobile stats below avatar */}
<div className="flex md:hidden justify-center gap-8 mt-4">
  <ProfileStats userId={profile.id} />
</div>
```

## Data Source Changes
The following count is already being calculated in the `fetchProfileStats` function but not returned. Update line 73-78 to include:
```typescript
return {
  posts: (postsRes as { count: number }).count || 0,
  following: following.size,  // Add this
  followers: followersRes.count || 0,
};
```

## Translation Keys
Add i18n support for stat labels:
- `profile.stats.posts`: "posts"
- `profile.stats.following`: "following" 
- `profile.stats.followers`: "followers"

## Visual Result
The profile header will display like this:

```text
+------------------------------------------+
|          HEADER BANNER IMAGE             |
+------------------------------------------+
|  [Avatar]    109      126      166       |
|              posts  following followers  |
|                                          |
|  Display Name              [Edit Profile]|
|  @username                               |
+------------------------------------------+
```

## Files to Modify
1. `src/components/profile/ProfileStats.tsx` - Redesign component with Mastodon-style layout
2. `src/pages/Profile.tsx` - Uncomment and reposition ProfileStats component
3. `src/i18n/locales/en.json` - Add translation keys (optional)
4. `src/i18n/locales/sv.json` - Add Swedish translations (optional)
