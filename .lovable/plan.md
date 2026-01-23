
# Message Encryption and Reaction Fixes

## Overview

Two issues to address:
1. **Message Encryption**: Messages are currently stored as plain text in the database, making them readable by anyone with database access
2. **Message Reactions**: The reaction system is wired up correctly but may have visibility/UX issues preventing users from discovering and using the feature

---

## Issue 1: Message Encryption

### Current State
- Messages are stored in plain text in the `content` column of the `messages` table
- Example: `"Hej!"`, `"Nämen hejsan!"` are visible as-is in the database
- An encryption module already exists for federated session tokens (`supabase/functions/_shared/token-encryption.ts`) using AES-GCM

### Proposed Solution

Implement end-to-end-style encryption for direct messages using the existing encryption infrastructure, with server-side encryption/decryption for simplicity.

#### A) Database Changes

Add an `encrypted_content` column and track encryption status:

```sql
ALTER TABLE messages 
ADD COLUMN encrypted_content text,
ADD COLUMN is_encrypted boolean DEFAULT false;
```

#### B) Create Message Encryption Edge Function

Create a new shared utility `supabase/functions/_shared/message-encryption.ts` based on the existing token encryption:

- `encryptMessage(content: string): Promise<string>` - Encrypts message content using AES-GCM
- `decryptMessage(encryptedContent: string): Promise<string>` - Decrypts message content

Uses the existing `TOKEN_ENCRYPTION_KEY` secret (or a dedicated `MESSAGE_ENCRYPTION_KEY` for separation of concerns).

#### C) Modify Message Service

Update `src/services/messageService.ts`:
- When sending: Call encryption before storing
- When fetching: Call decryption before displaying

Two approaches:
1. **Server-side via Edge Function** (recommended for simplicity):
   - Create `send-message` and `get-messages` edge functions that handle encryption/decryption
   - Frontend calls these instead of direct Supabase queries

2. **Client-side encryption** (more complex but true E2E):
   - Requires key exchange between users
   - Much more complex to implement

#### D) Migration for Existing Messages

Create a one-time migration to encrypt existing plain-text messages:
- Read all messages with `is_encrypted = false`
- Encrypt the `content` and store in `encrypted_content`
- Set `is_encrypted = true`
- Optionally clear the `content` column

### Recommended Implementation

Server-side encryption via edge functions:

| File | Change |
|------|--------|
| `supabase/functions/_shared/message-encryption.ts` | New file - encryption/decryption utilities |
| `supabase/functions/send-message/index.ts` | New edge function - encrypt and store messages |
| `supabase/functions/get-messages/index.ts` | New edge function - fetch and decrypt messages |
| `src/services/messageService.ts` | Update to use edge functions instead of direct queries |
| Database migration | Add `encrypted_content` and `is_encrypted` columns |

### Security Considerations

- The encryption key is stored as a Supabase secret, accessible only to edge functions
- Database administrators can still see encrypted content, but it's not readable
- This is "encryption at rest" - protects against database breaches
- For true end-to-end encryption, a client-side key exchange would be needed (much more complex)

---

## Issue 2: Message Reactions Not Working

### Current State
- The `MessageReactions` component is correctly imported and rendered in `MessageConversation.tsx`
- The `reactions` table has proper RLS policies
- Reactions work for posts and replies (verified - there are entries in the database)
- Zero message reactions exist in the database

### Diagnosis

The code appears correct. Possible issues:

1. **Visibility**: The reaction button is hidden until hover (`opacity-0 group-hover:opacity-100`), which may be too subtle on mobile or for users who don't hover
2. **No visual indicator**: Unlike posts which show reaction counts prominently, message reactions only appear on hover
3. **Simply not used yet**: Users may not have discovered the feature

### Proposed Fixes

#### A) Improve Reaction Button Visibility

Update `MessageReactions.tsx` to show the reaction button more prominently:

```tsx
// Current: opacity-0 group-hover:opacity-100
// Proposed: Always visible but subtle
className={cn(
  "p-1 rounded-full transition-colors",
  isOwnMessage 
    ? "hover:bg-primary-foreground/20 text-primary-foreground/50 hover:text-primary-foreground/70"
    : "hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground",
  hasReactions && "text-primary"
)}
```

#### B) Add Touch-Friendly Long-Press for Mobile

For mobile users, implement long-press to show reaction picker (optional enhancement).

#### C) Verify the mutation is working

Add error handling feedback in the mutation:

```tsx
const toggleMutation = useMutation({
  mutationFn: (reaction: ReactionKey) => toggleReaction('message', messageId, reaction),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['messageReactions', messageId] });
  },
  onError: (error) => {
    console.error('Failed to toggle reaction:', error);
    toast.error('Failed to add reaction');
  },
});
```

### Files to Modify

| File | Change |
|------|--------|
| `src/components/MessageReactions.tsx` | Improve visibility, add error handling |

---

## Implementation Priority

1. **Message Reactions** (quick fix) - Make the reaction button more visible
2. **Message Encryption** (larger effort) - Implement server-side encryption

---

## Technical Notes

### Encryption Approach Comparison

| Approach | Pros | Cons |
|----------|------|------|
| Server-side (edge functions) | Simple implementation, works with existing auth | Key on server, not true E2E |
| Client-side (WebCrypto) | True E2E encryption | Complex key exchange, device sync issues |
| Hybrid | Balance of security and usability | More complex implementation |

**Recommendation**: Start with server-side encryption using edge functions. This protects against database breaches while keeping the implementation manageable. True E2E can be added later as an enhancement.

### Existing Infrastructure

The project already has:
- `TOKEN_ENCRYPTION_KEY` secret configured
- AES-GCM encryption utilities in `token-encryption.ts`
- Edge function patterns for `send-dm` that can be adapted

This provides a solid foundation for implementing message encryption.
