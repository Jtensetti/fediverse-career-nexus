

# Fix Message Encryption and Reaction Visibility

## Summary

Two issues identified:

1. **Message encryption is not working** - The edge function exists but is never being called successfully. All messages are stored as plain text despite encryption code being in place.

2. **Message reactions not visible** - The reaction component is rendered inside the message bubble but may be hard to find for users. No message reactions exist in the database.

---

## Issue 1: Message Encryption Not Working

### Root Cause Analysis

The encryption is silently failing because:

1. **The edge function is called but fails** - Looking at the `sendMessage` function in `messageService.ts`:
   ```typescript
   try {
     const { data: encryptData, error: encryptError } = await supabase.functions.invoke('encrypt-message', {
       body: { action: 'encrypt', content }
     });
     
     if (!encryptError && encryptData?.encryptedContent) {
       encryptedContent = encryptData.encryptedContent;
       isEncrypted = true;
     }
   } catch (encryptErr) {
     console.warn('Message encryption failed, storing as plain text:', encryptErr);
   }
   ```

2. **The catch block swallows errors** - When encryption fails, it logs a warning and stores the message as plain text anyway. This is a design choice for resilience but makes debugging hard.

3. **No edge function call logs** - The analytics show zero calls to `encrypt-message`, which means either:
   - The code path isn't being executed
   - The Supabase client isn't correctly invoking the function
   - The changes weren't deployed properly

### Fixes Required

#### A) Add the edge function to config.toml

The function should be explicitly listed to ensure proper deployment:

```toml
[functions.encrypt-message]
verify_jwt = false
```

Setting `verify_jwt = false` because authentication is handled within the function itself.

#### B) Add better error logging in messageService.ts

Replace the silent warning with visible feedback:

```typescript
} catch (encryptErr) {
  console.error('Message encryption failed:', encryptErr);
  // Still store as plain text but warn user
}
```

#### C) Verify the edge function is deployed

After adding to config.toml, ensure the function deploys correctly.

---

## Issue 2: Message Reactions Not Visible

### Root Cause Analysis

The `MessageReactions` component is rendered inside each message bubble at line 388-391:

```tsx
<MessageReactions 
  messageId={message.id} 
  isOwnMessage={isOwnMessage}
/>
```

However, there are zero message reactions in the database. The component shows:
- A small smiley icon button (3.5x3.5 size) 
- Very subtle styling with `text-muted-foreground/40`
- Only visible when there are reactions to show OR when hovering

### Fixes Required

#### A) Move reactions outside the message bubble

Currently, the `MessageReactions` component is INSIDE the message bubble container. Move it outside so it's clearly separate from the message content:

**Current structure:**
```tsx
<div className="group max-w-[70%] p-3 rounded-lg">
  <p>Message content</p>
  <p>Timestamp</p>
  <MessageReactions /> {/* Inside bubble */}
</div>
```

**Proposed structure:**
```tsx
<div className="flex flex-col">
  <div className="group max-w-[70%] p-3 rounded-lg">
    <p>Message content</p>
    <p>Timestamp</p>
  </div>
  <MessageReactions /> {/* Outside bubble, below it */}
</div>
```

#### B) Make the reaction button more visible

Update `MessageReactions.tsx`:
- Increase the icon size from `h-3.5 w-3.5` to `h-4 w-4`
- Add a tooltip hint "React to message"
- Make the button more visible with better contrast

#### C) Add hover state on message for reaction access

Show the reaction button when hovering anywhere on the message row, not just the button itself.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/config.toml` | Add `encrypt-message` function config |
| `src/services/messageService.ts` | Improve error logging for encryption failures |
| `src/pages/MessageConversation.tsx` | Move MessageReactions outside the message bubble |
| `src/components/MessageReactions.tsx` | Make button larger and more visible |

---

## Implementation Details

### 1. supabase/config.toml

Add the encrypt-message function configuration:

```toml
[functions.encrypt-message]
verify_jwt = false
```

### 2. src/services/messageService.ts

Improve encryption error handling (around lines 348-359):

```typescript
try {
  const { data: encryptData, error: encryptError } = await supabase.functions.invoke('encrypt-message', {
    body: { action: 'encrypt', content }
  });
  
  if (encryptError) {
    console.error('Encryption error:', encryptError);
  } else if (encryptData?.encryptedContent) {
    encryptedContent = encryptData.encryptedContent;
    isEncrypted = true;
    console.log('Message encrypted successfully');
  } else {
    console.error('Encryption returned no data:', encryptData);
  }
} catch (encryptErr) {
  console.error('Message encryption failed:', encryptErr);
}
```

### 3. src/pages/MessageConversation.tsx

Restructure the message rendering to move reactions outside the bubble (around lines 357-396):

```tsx
messages.map((message) => {
  const isOwnMessage = message.sender_id === currentUserId;
  return (
    <div 
      key={message.id} 
      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
    >
      <div 
        className={`group max-w-[70%] p-3 rounded-lg
          ${isOwnMessage 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
          }
        `}
      >
        <p 
          className="break-words whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ 
            __html: renderMessageContent(message.content) 
          }}
        />
        <p className="text-xs opacity-70 mt-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </p>
      </div>
      {/* Reactions moved OUTSIDE the bubble */}
      <MessageReactions 
        messageId={message.id} 
        isOwnMessage={isOwnMessage}
        className="mt-1"
      />
    </div>
  );
})
```

### 4. src/components/MessageReactions.tsx

Improve visibility of the reaction button:

```tsx
{/* Reaction picker trigger - make it larger and more visible */}
<Popover open={showPicker} onOpenChange={setShowPicker}>
  <PopoverTrigger asChild>
    <button
      className={cn(
        "p-1.5 rounded-full transition-all",
        "border border-transparent hover:border-border",
        isOwnMessage 
          ? "hover:bg-primary/20 text-muted-foreground hover:text-foreground"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        hasReactions && "text-primary border-primary/30"
      )}
      aria-label="Add reaction"
      title="React to this message"
    >
      <Smile className="h-4 w-4" />
    </button>
  </PopoverTrigger>
  ...
</Popover>
```

---

## Testing Plan

### Encryption Testing
1. Send a new message after deployment
2. Check the database: `is_encrypted` should be `true` and `encrypted_content` should contain Base64 data
3. Verify the message displays correctly in the UI (decryption works)

### Reactions Testing
1. Open a conversation
2. Verify the smiley button is visible below each message
3. Click to add a reaction
4. Verify the reaction appears and is saved to the database

---

## Optional: Migration for Existing Messages

After confirming encryption works for new messages, we can create a migration script to encrypt existing plain-text messages:

```sql
-- This would be done via an edge function, not direct SQL
-- The edge function would:
-- 1. Fetch messages where is_encrypted = false
-- 2. Encrypt each message.content
-- 3. Update encrypted_content and set is_encrypted = true
-- 4. Optionally clear the content column
```

This is optional and can be done as a separate task.

