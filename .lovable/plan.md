
# Fix: Profile Page Crash - React Hooks Violation

## Problem Confirmed

The console logs show **React error #310** which means "Rendered more hooks than during the previous render." This is caused by calling hooks conditionally or after early returns.

## Root Cause

In `src/components/FederationInfo.tsx`:

```tsx
// Lines 116-122 - Early returns
if (loading) {
  return null;
}

if (!actor) {
  return null;
}

// Line 129 - useState AFTER conditional returns - CAUSES ERROR #310
const [copied, setCopied] = useState(false);
```

When the component first renders with `loading=true`, it returns `null` before reaching the `useState`. On the next render when `loading=false`, React sees an extra hook and crashes.

## Solution

Move `const [copied, setCopied] = useState(false)` to line 26, with the other hooks at the top of the component.

## File to Modify

| File | Change |
|------|--------|
| `src/components/FederationInfo.tsx` | Move `useState(false)` from line 129 to line 26 |

## Implementation

**Before (line 129):**
```tsx
const [copied, setCopied] = useState(false);
```

**After (add at line 26, remove from line 129):**
```tsx
const [loading, setLoading] = useState<boolean>(true);
const [updating, setUpdating] = useState<boolean>(false);
const [actor, setActor] = useState<any>(null);
const [currentUserActor, setCurrentUserActor] = useState<any>(null);
const [federationEnabled, setFederationEnabled] = useState<boolean>(true);
const [copied, setCopied] = useState(false);  // ← ADD HERE
const { toast } = useToast();
```

## Expected Outcome

After this one-line fix:
- The `/profile` page will load without crashing
- The "Something went wrong" error will be gone
- React error #310 will no longer appear
