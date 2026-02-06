
# Refined Full Federation Implementation Plan

## Analysis Summary

Your feedback identified three critical risks and strategic improvements. After reviewing the codebase, I can confirm:

### Current State (What Works)
| Component | Status | Notes |
|-----------|--------|-------|
| HTTP Signatures | Complete | Digest (SHA-256), Date header, signature all implemented correctly |
| RSA Key Management | Complete | Auto-generation on demand |
| WebFinger | Complete | Uses `nolto.social` domain |
| Inbox Processing | Complete | Handles Follow/Accept/Undo/Create/Like/Announce/Delete |
| Queue System | Complete | Partitioned (16 shards) with status tracking |
| Outbox | Complete | JWT auth, batched delivery for Create activities |
| Content-Type | Uses `application/activity+json` - needs upgrade to `ld+json` profile |

### Gaps Identified
1. Queue claim mechanism missing (race condition risk)
2. SharedInbox batching not implemented in federation worker
3. No Tombstone handling for Delete
4. Content-Type missing `ld+json` profile
5. No scheduled processing (pg_cron)

---

## Phase-by-Phase Implementation

### Phase 1A: Fix The Trigger Trap (Queue Claim Mechanism)

The current federation worker has a race condition - it marks items as "processing" AFTER fetching them.

**Current Problematic Code** (`supabase/functions/federation/index.ts`):
```typescript
// PROBLEM: Fetches items, THEN marks as processing
const { data: queueItems } = await supabaseClient
  .from("federation_queue_partitioned")
  .select("*")
  .eq("status", "pending")
  ...

// Later, in loop:
await supabaseClient
  .update({ status: "processing" })
  .eq("id", item.id);
```

**Fix**: Add database function for atomic claim with SKIP LOCKED:

```sql
-- New migration: claim mechanism
CREATE OR REPLACE FUNCTION claim_federation_items(
  p_partition INTEGER,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF federation_queue_partitioned
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE federation_queue_partitioned
  SET 
    status = 'processing',
    processed_at = now()
  WHERE id IN (
    SELECT id FROM federation_queue_partitioned
    WHERE partition_key = p_partition
      AND status = 'pending'
      AND (scheduled_for IS NULL OR scheduled_for <= now())
    ORDER BY priority DESC, created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$;
```

**Update Edge Function**: Replace SELECT+UPDATE with single RPC call.

---

### Phase 1B: Thin Trigger for Post Fanout

Instead of building heavy JSON in the trigger, store only IDs and let the worker build the activity.

```sql
-- Minimal trigger - just queue the post ID
CREATE OR REPLACE FUNCTION queue_post_for_federation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for Note types (skip Create wrappers which are already handled by outbox)
  IF NEW.type = 'Note' AND NEW.attributed_to IS NOT NULL THEN
    INSERT INTO federation_queue_partitioned (
      actor_id, 
      activity,  -- Minimal payload - worker will enrich
      status, 
      partition_key,
      priority
    ) VALUES (
      NEW.attributed_to,
      jsonb_build_object(
        'type', 'Create',
        'object_id', NEW.id::text,
        'needs_enrichment', true
      ),
      'pending',
      actor_id_to_partition_key(NEW.attributed_to),
      5  -- Normal priority
    );
  END IF;
  RETURN NEW;
END;
$$;
```

Note: The current `postService.ts` already invokes the outbox directly (line 307), so this trigger is primarily for posts created through other paths.

---

### Phase 2: SharedInbox Optimization (Critical for Scaling)

Update `supabase/functions/federation/index.ts` to batch by sharedInbox.

```typescript
async function getSharedInboxMap(actorId: string): Promise<Map<string, string[]>> {
  // Get all accepted followers
  const { data: followers } = await supabaseClient
    .from("actor_followers")
    .select("follower_actor_url")
    .eq("local_actor_id", actorId)
    .eq("status", "accepted");
  
  const inboxMap = new Map<string, string[]>();
  
  for (const follower of followers || []) {
    // Check cache for sharedInbox
    const { data: cached } = await supabaseClient
      .from("remote_actors_cache")
      .select("actor_data")
      .eq("actor_url", follower.follower_actor_url)
      .single();
    
    const actorData = cached?.actor_data as any;
    const sharedInbox = actorData?.endpoints?.sharedInbox || actorData?.inbox;
    
    if (sharedInbox) {
      if (!inboxMap.has(sharedInbox)) {
        inboxMap.set(sharedInbox, []);
      }
      inboxMap.get(sharedInbox)!.push(follower.follower_actor_url);
    }
  }
  
  return inboxMap;
}
```

This reduces N individual HTTP calls to M unique sharedInbox calls (typically 10-100x fewer requests).

---

### Phase 3: Content-Type Header Upgrade

Update `supabase/functions/_shared/http-signature.ts`:

```typescript
// Line 326-328: Change Content-Type
if (!headers.has("Content-Type")) {
  headers.set("Content-Type", 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"');
}
```

Some strict servers (Pleroma, certain Mastodon forks) require the full LD+JSON profile.

---

### Phase 4: Delete with Tombstone

When a post is deleted, preserve a Tombstone for proper 410 responses.

```sql
-- Trigger for delete propagation
CREATE OR REPLACE FUNCTION queue_delete_for_federation()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.attributed_to IS NOT NULL THEN
    -- Create tombstone record
    INSERT INTO ap_objects (
      id, type, attributed_to, content, published_at
    ) VALUES (
      OLD.id,
      'Tombstone',
      OLD.attributed_to,
      jsonb_build_object(
        'type', 'Tombstone',
        'formerType', OLD.type,
        'deleted', now()
      ),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET 
      type = 'Tombstone',
      content = EXCLUDED.content;
    
    -- Queue delete activity
    INSERT INTO federation_queue_partitioned (
      actor_id, activity, status, partition_key, priority
    ) VALUES (
      OLD.attributed_to,
      jsonb_build_object(
        'type', 'Delete',
        'object', OLD.content->>'id',
        'needs_enrichment', true
      ),
      'pending',
      actor_id_to_partition_key(OLD.attributed_to),
      8  -- High priority for deletes
    );
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trigger_federate_deleted_post
  BEFORE DELETE ON ap_objects
  FOR EACH ROW
  WHEN (OLD.type IN ('Note', 'Create'))
  EXECUTE FUNCTION queue_delete_for_federation();
```

Update the actor endpoint to return 410 Gone for Tombstones.

---

### Phase 5: Mention Handling

When a post contains @user@domain.tld:

1. Parse mentions from content
2. WebFinger lookup for each remote mention
3. Add to `tag` array in Note object
4. Add actor URL to `cc` field
5. Queue direct delivery to their inbox

The current `postService.ts` already extracts mentions (line 271), but only creates local notifications. Extend for federation:

```typescript
// In postService.ts or new federationMentionService.ts
async function processFederatedMentions(content: string, noteObject: any) {
  const mentions = extractMentions(content);
  const tags: any[] = [];
  
  for (const mention of mentions) {
    if (mention.includes('@')) {
      // Remote mention - format: user@domain
      const [username, domain] = mention.split('@');
      
      // WebFinger lookup
      const actorUrl = await lookupRemoteActor(username, domain);
      
      if (actorUrl) {
        tags.push({
          type: 'Mention',
          href: actorUrl,
          name: `@${mention}`
        });
        
        // Add to cc for direct delivery
        if (!noteObject.cc) noteObject.cc = [];
        noteObject.cc.push(actorUrl);
      }
    }
  }
  
  if (tags.length > 0) {
    noteObject.tag = [...(noteObject.tag || []), ...tags];
  }
  
  return noteObject;
}
```

---

### Phase 6: Retry with Exponential Backoff

Add columns and update worker logic:

```sql
-- Add retry scheduling columns
ALTER TABLE federation_queue_partitioned
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS max_attempts INTEGER DEFAULT 10;

-- Update claim function to respect retry timing
CREATE OR REPLACE FUNCTION claim_federation_items(
  p_partition INTEGER,
  p_limit INTEGER DEFAULT 50
)
RETURNS SETOF federation_queue_partitioned
...
WHERE partition_key = p_partition
  AND status IN ('pending', 'retry')
  AND (next_retry_at IS NULL OR next_retry_at <= now())
  AND attempts < max_attempts
...
```

Worker response handling:
```typescript
// In federation worker
if (!response.ok) {
  const shouldRetry = response.status >= 500 || 
                      response.status === 408 || 
                      response.status === 429;
  
  if (shouldRetry && item.attempts < 10) {
    const backoffMinutes = Math.pow(2, item.attempts); // 1, 2, 4, 8, 16, 32...
    await supabaseClient
      .from("federation_queue_partitioned")
      .update({ 
        status: 'retry',
        attempts: item.attempts + 1,
        next_retry_at: new Date(Date.now() + backoffMinutes * 60000),
        last_error: `HTTP ${response.status}`
      })
      .eq("id", item.id);
  } else if (response.status === 410) {
    // Gone - actor deleted, remove from followers
    await supabaseClient
      .from("actor_followers")
      .delete()
      .eq("follower_actor_url", recipientUri);
    
    await markAsCompleted(item.id);
  } else {
    await markAsFailed(item.id, `HTTP ${response.status}`);
  }
}
```

---

### Phase 7: Scheduled Processing (pg_cron)

Since Lovable Cloud uses Supabase, pg_cron should be available:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule coordinator to run every minute
SELECT cron.schedule(
  'federation-coordinator',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/federation-coordinator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/XXXXXX_federation_v2.sql` | New - claim function, triggers, retry columns, cron |
| `supabase/functions/federation/index.ts` | Use claim RPC, sharedInbox batching, retry logic |
| `supabase/functions/_shared/http-signature.ts` | Content-Type upgrade |
| `src/services/postService.ts` | Add federated mention handling |
| `supabase/functions/actor/index.ts` | Return 410 for Tombstones |

---

## Definition of Done Checklist

Before deploying:

- [ ] Digest Header: SHA-256 of body included in signature (Verified: line 86-90 of http-signature.ts)
- [ ] Date Header: Within 5 minutes tolerance (Verified: line 163-168 of http-signature.ts)
- [ ] Content-Type: Upgrade to `application/ld+json; profile="..."` (Needs fix)
- [ ] Claim mechanism: SKIP LOCKED prevents double-processing (Needs implementation)
- [ ] SharedInbox: Batched delivery reduces API calls (Needs implementation)
- [ ] Tombstone: 410 Gone for deleted content (Needs implementation)
- [ ] Retry: Exponential backoff with max attempts (Needs implementation)

---

## Implementation Priority

1. **Phase 1A** (Critical): Claim mechanism - prevents duplicate deliveries
2. **Phase 2** (Critical): SharedInbox batching - prevents rate limiting
3. **Phase 6** (High): Retry logic - handles transient failures gracefully
4. **Phase 3** (Medium): Content-Type fix - compatibility with strict servers
5. **Phase 4** (Medium): Tombstone handling - proper delete propagation
6. **Phase 5** (Medium): Mention handling - social interactions
7. **Phase 7** (High): pg_cron scheduling - automated processing
8. **Phase 1B** (Low): Post fanout trigger - backup path (outbox already handles this)
