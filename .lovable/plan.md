
# Feed System Overhaul Plan

## Overview
This plan restructures the three feed types with clear, distinct purposes and adds support for @mentions and #hashtags.

## Current Issues
1. **Following feed** - Currently includes connections and author follows, but doesn't show boosts/quote reposts from followed users
2. **Local feed** - Correctly filters by `source='local'`, but excludes `Announce` type activities (boosts)
3. **Federated feed** - Currently named "All" and shows everything, but should specifically show local + remote posts from people you follow on other instances
4. **Mentions/Hashtags** - Not parsed or made clickable in post content

## Feed Definitions

### 1. Following Feed
**Purpose**: Posts from people you follow or are connected with, including their boosts and quote reposts

**Content includes**:
- Original posts (Note, Create, Article) from:
  - Users you follow via `author_follows`
  - Users you're connected with via `user_connections` (status: accepted)
  - Your own posts
- Boosts/Quote reposts (Announce) made BY people you follow/are connected with

### 2. Local Feed
**Purpose**: All posts made on Nolto by anyone (not just followed users)

**Content includes**:
- All original posts where `source = 'local'`
- No boosts/reposts (to avoid duplication - the original post is already shown)
- With replies (not only top-level posts)

### 3. Federated Feed
**Purpose**: Combined view of local posts + remote posts from people you follow on external instances

**Content includes**:
- All local posts (same as Local feed)
- Remote posts from users you follow who are on other instances (identified by `home_instance` or `is_remote`)
- Boosts from remote followed users
- This is the "full Fediverse view" for users who signed up via Fediverse OAuth

## Technical Implementation

### Phase 1: Database Changes

**Update the `federated_feed` view** to include `Announce` type:

```sql
CREATE OR REPLACE VIEW public.federated_feed 
WITH (security_invoker = true)
AS
SELECT 
  ap.id,
  ap.type,
  ap.content,
  ap.attributed_to,
  ap.published_at,
  'local' AS source
FROM public.ap_objects ap
WHERE ap.type IN ('Note', 'Article', 'Create', 'Announce')
  AND (
    -- For non-Announce posts, exclude replies
    (ap.type != 'Announce' AND ap.content->>'inReplyTo' IS NULL AND ap.content->'object'->>'inReplyTo' IS NULL)
    -- For Announce posts, include all
    OR ap.type = 'Announce'
  )
  AND (ap.content->>'type' IS NULL OR ap.content->>'type' NOT IN ('Like'))
ORDER BY ap.published_at DESC;
```

### Phase 2: Service Layer Changes

**File: `src/services/federationService.ts`**

1. Update `FeedType` to match new naming: `'following' | 'local' | 'federated'`

2. Update `getFederatedFeed` function:
   - **Following feed**: Filter to posts where actor is in followed users list, INCLUDING Announce types
   - **Local feed**: Filter to `source='local'` and exclude Announce types (to avoid duplication)
   - **Federated feed**: Include all local posts PLUS remote posts from followed users with `home_instance` or `is_remote=true`

```typescript
// For 'following' feed:
// Include posts AND boosts from followed users
if (feedType === 'following') {
  filteredObjects = apObjects.filter((obj: any) => {
    const actorUserId = obj.actors?.user_id;
    return actorUserId && followedUserIds.includes(actorUserId);
  });
}

// For 'local' feed:
// All local posts except Announce to avoid duplication
if (feedType === 'local') {
  filteredObjects = apObjects.filter((obj: any) => 
    obj.source === 'local' && obj.type !== 'Announce'
  );
}

// For 'federated' feed:
// Local posts + remote posts from followed users
if (feedType === 'federated') {
  const remoteFollowedIds = await getRemoteFollowedUserIds(userId);
  filteredObjects = apObjects.filter((obj: any) => {
    if (obj.source === 'local') return true;
    const actorUserId = obj.actors?.user_id;
    return actorUserId && remoteFollowedIds.includes(actorUserId);
  });
}
```

3. Add helper function `getRemoteFollowedUserIds` to get users you follow who have `home_instance` set (federated users)

### Phase 3: UI Updates

**File: `src/services/feedPreferencesService.ts`**
- Remove 'all' from FeedType, keep `'following' | 'local' | 'federated'`

**File: `src/components/FeedSelector.tsx`**
- Already has correct tabs: Following, Local, Federated
- Update descriptions:
  - Following: "Posts from people you follow"
  - Local: "All posts on Nolto"
  - Federated: "Local + remote follows"

**File: `src/components/FederatedFeed.tsx`**
- Remove 'all' feed type handling
- Default to 'following' instead of 'all'

**File: `src/pages/FederatedFeed.tsx`**
- Update default feed from 'all' to 'following'

### Phase 4: @Mentions Support

**File: `src/lib/linkify.ts`**
Add mention parsing:

```typescript
// Regex for @mentions - handles @username and @username@instance.com
const MENTION_REGEX = /@([a-zA-Z0-9_]+)(?:@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,}))?/g;

export function linkifyMentions(text: string): string {
  return text.replace(MENTION_REGEX, (match, username, instance) => {
    // If no instance, assume local user
    const profilePath = instance 
      ? `/profile/${username}@${instance}` // Remote user (future: federation lookup)
      : `/profile/${username}`;
    
    return `<a href="${profilePath}" class="text-primary hover:underline font-medium">@${username}${instance ? '@' + instance : ''}</a>`;
  });
}

// Update linkifyText to also handle mentions
export function linkifyText(text: string): string {
  // ... existing URL linkification
  // Add mention linkification after URLs
  const withMentions = linkifyMentions(linkedText);
  return withMentions;
}
```

**File: `src/services/postService.ts`**
Add mention extraction and notification:

```typescript
// Extract mentions when creating a post
function extractMentions(content: string): string[] {
  const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;
  const matches = [...content.matchAll(MENTION_REGEX)];
  return matches.map(m => m[1]); // Return just usernames
}

// In createPost function, after post creation:
const mentions = extractMentions(postData.content);
for (const username of mentions) {
  // Look up user by username
  const { data: mentionedUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();
  
  if (mentionedUser && mentionedUser.id !== user.id) {
    // Create mention notification
    await supabase.from('notifications').insert({
      type: 'mention',
      recipient_id: mentionedUser.id,
      actor_id: user.id,
      object_id: newPostId,
      object_type: 'post',
      content: JSON.stringify({ preview: postData.content.substring(0, 100) })
    });
  }
}
```

### Phase 5: #Hashtag Support (Display Only)

**File: `src/lib/linkify.ts`**
Add hashtag parsing (display only for now):

```typescript
// Regex for #hashtags
const HASHTAG_REGEX = /#([a-zA-Z0-9_]+)/g;

export function linkifyHashtags(text: string): string {
  return text.replace(HASHTAG_REGEX, (match, tag) => {
    // Link to search page with hashtag query (future: dedicated hashtag page)
    return `<a href="/search?q=%23${encodeURIComponent(tag)}" class="text-primary hover:underline font-medium">#${tag}</a>`;
  });
}
```

Update `linkifyText` to include hashtags:

```typescript
export function linkifyText(text: string): string {
  // Protect existing anchors
  // ... existing code
  
  // Linkify URLs
  // ... existing code
  
  // Linkify mentions
  const withMentions = linkifyMentions(linkedText);
  
  // Linkify hashtags
  const withHashtags = linkifyHashtags(withMentions);
  
  // Restore original anchors
  return restoreAnchors(withHashtags);
}
```

## Files to Modify

1. **Database Migration** (new file)
   - Update `federated_feed` view to include Announce type

2. **`src/services/federationService.ts`**
   - Update FeedType definition
   - Rewrite feed filtering logic for each feed type
   - Add `getRemoteFollowedUserIds` helper

3. **`src/services/feedPreferencesService.ts`**
   - Update FeedType (remove 'all')

4. **`src/components/FeedSelector.tsx`**
   - Update tab descriptions

5. **`src/components/FederatedFeed.tsx`**
   - Update default feed type
   - Remove 'all' handling

6. **`src/pages/FederatedFeed.tsx`**
   - Update default state from 'all' to 'following'

7. **`src/lib/linkify.ts`**
   - Add `linkifyMentions` function
   - Add `linkifyHashtags` function
   - Update `linkifyText` to use both

8. **`src/services/postService.ts`**
   - Add `extractMentions` function
   - Add notification creation for mentions in `createPost`

9. **`src/i18n/locales/en.json`** & **`sv.json`**
   - Update feed descriptions

## Order of Implementation

1. Database migration (view update)
2. Service layer updates (federationService, feedPreferencesService)
3. UI component updates (FeedSelector, FederatedFeed)
4. Page updates (FederatedFeed.tsx)
5. Linkify updates (mentions + hashtags)
6. Post service updates (mention notifications)
7. i18n updates

## Notes

- Hashtags currently link to search page since there's no dedicated hashtag infrastructure
- Remote user mentions (@user@instance) will display as links but won't create notifications (future federation feature)
- The Federated feed is specifically designed for users who signed up via Fediverse OAuth and follow people on other instances
