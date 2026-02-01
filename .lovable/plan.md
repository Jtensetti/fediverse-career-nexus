
# Markdown Enhancement Plan (Revised)

## Overview
Implement enhanced markdown support with a **context-aware fixed toolbar** that dynamically changes based on text selection:
1. **Articles** - Sleek fixed toolbar (top on desktop, bottom on mobile) that changes buttons when text is selected
2. **Bio** - Basic markdown rendering (bold, italic, links)
3. **Posts** - Basic markdown rendering matching bio

---

## Part 1: Context-Aware Article Editor

### Design Concept
A single fixed toolbar that **transforms based on context**:

```text
DEFAULT STATE (no selection):
┌──────────────────────────────────────────────────────────┐
│  [Aa] [+] [Link] [•] [1.] [Quote] [Code] [—] [Image]     │
│   ↳ Heading, Add block, Insert link, Bullets, Numbers,   │
│     Blockquote, Code block, Divider, Media               │
└──────────────────────────────────────────────────────────┘

SELECTION STATE (text highlighted):
┌──────────────────────────────────────────────────────────┐
│  [B] [I] [S] [Aa] [Link] [Code] [Clear]                  │
│   ↳ Bold, Italic, Strikethrough, Heading, Link,          │
│     Inline code, Clear formatting                        │
└──────────────────────────────────────────────────────────┘
```

### Mobile Behavior
- Toolbar fixed at bottom, above keyboard
- Same dynamic behavior: buttons change when text is selected
- Compact icons only (no labels)
- Smooth transition when toggling between states

### Key Implementation Details
- Track selection state via `selectionchange` event listener
- Check if textarea has selected text (`selectionStart !== selectionEnd`)
- Animate toolbar button transitions with framer-motion
- Remove Write/Preview tabs - clean writing experience only
- No explanatory text or help buttons

---

## Part 2 & 3: Bio and Posts - Simple Markdown Rendering

### Approach
Create a lightweight component that parses and renders:
- **Bold**: `**text**` or `__text__` → `<strong>`
- **Italic**: `*text*` or `_text_` → `<em>`
- **Links**: Already handled by linkify, but also support `[text](url)` syntax

### Integration
- Bio: Wrap `profile.bio` in `SimpleMarkdown` component (Profile.tsx line 598)
- Posts: Apply in `FederatedPostCard.tsx` after content sanitization, before linkify

---

## Technical Implementation

### New Files to Create

#### 1. `src/components/ArticleEditor.tsx`
Main editor component with:
- Ref to textarea for selection tracking
- `hasSelection` state boolean
- `useEffect` to listen for `selectionchange` events
- Mobile detection via `useIsMobile` hook
- Conditional toolbar rendering based on `hasSelection`
- Clean, border-less textarea with large font

#### 2. `src/components/editor/EditorToolbar.tsx`
Reusable toolbar component:
- Props: `hasSelection`, `onAction`, `isMobile`
- Two sets of buttons: default actions vs selection actions
- Smooth animated transitions between states
- Icon-only on mobile, optional labels on desktop

#### 3. `src/components/editor/LinkInsertSheet.tsx`
Mobile-friendly link insertion:
- Sheet on mobile, Popover on desktop
- URL input field
- Optional display text field
- Insert button

#### 4. `src/components/common/SimpleMarkdown.tsx`
Lightweight markdown renderer:
```typescript
// Parse **bold**, *italic*, [link](url)
// Return sanitized HTML string or React elements
// Integrate with existing linkifyText
```

### Files to Modify

#### `src/pages/ArticleCreate.tsx`
- Replace `MarkdownEditor` import with `ArticleEditor`
- Remove label prop (editor is self-contained)

#### `src/pages/ArticleEdit.tsx`
- Same replacement as ArticleCreate

#### `src/pages/Profile.tsx` (line 598)
- Wrap bio display with SimpleMarkdown:
```tsx
// Before
{profile.bio && <p className="...">{profile.bio}</p>}

// After
{profile.bio && <SimpleMarkdown content={profile.bio} className="..." />}
```

#### `src/components/FederatedPostCard.tsx`
- Update content rendering to apply simple markdown parsing
- Integrate with existing linkifyText flow

#### `src/lib/linkify.ts`
- Add function to parse `**bold**` and `*italic*` patterns
- Ensure it doesn't conflict with URL matching
- Export new `parseInlineMarkdown` function

---

## Selection Tracking Implementation

```typescript
// In ArticleEditor.tsx
const [hasSelection, setHasSelection] = useState(false);
const textareaRef = useRef<HTMLTextAreaElement>(null);

useEffect(() => {
  const checkSelection = () => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      setHasSelection(selectionStart !== selectionEnd);
    }
  };

  // Listen for selection changes
  document.addEventListener('selectionchange', checkSelection);
  
  // Also check on mouse up and key up for reliability
  const textarea = textareaRef.current;
  textarea?.addEventListener('mouseup', checkSelection);
  textarea?.addEventListener('keyup', checkSelection);

  return () => {
    document.removeEventListener('selectionchange', checkSelection);
    textarea?.removeEventListener('mouseup', checkSelection);
    textarea?.removeEventListener('keyup', checkSelection);
  };
}, []);
```

---

## Toolbar Actions

### Default State Actions
| Icon | Action | Markdown |
|------|--------|----------|
| Aa | Heading dropdown | `## `, `### `, etc. |
| + | Add block menu | Various |
| Link | Insert link | `[text](url)` |
| • | Bullet list | `- item` |
| 1. | Numbered list | `1. item` |
| Quote | Blockquote | `> text` |
| Code | Code block | ` ``` ` |
| — | Horizontal rule | `---` |
| Image | Image insert | `![alt](url)` |

### Selection State Actions
| Icon | Action | Markdown |
|------|--------|----------|
| B | Bold | `**text**` |
| I | Italic | `*text*` |
| S | Strikethrough | `~~text~~` |
| Aa | Make heading | Wraps line |
| Link | Wrap in link | `[selected](url)` |
| `</>` | Inline code | `` `text` `` |

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `src/components/ArticleEditor.tsx` | Create | New sleek editor with dynamic toolbar |
| `src/components/editor/EditorToolbar.tsx` | Create | Context-aware toolbar component |
| `src/components/editor/LinkInsertSheet.tsx` | Create | Mobile-friendly link insertion |
| `src/components/common/SimpleMarkdown.tsx` | Create | Lightweight inline markdown renderer |
| `src/pages/ArticleCreate.tsx` | Modify | Use new ArticleEditor |
| `src/pages/ArticleEdit.tsx` | Modify | Use new ArticleEditor |
| `src/pages/Profile.tsx` | Modify | Render bio with SimpleMarkdown |
| `src/components/FederatedPostCard.tsx` | Modify | Apply inline markdown to post content |
| `src/lib/linkify.ts` | Modify | Add inline markdown parsing |

---

## Mobile UX Details
- Toolbar height: ~44px (comfortable touch targets)
- Uses `position: fixed` at bottom when keyboard is open
- Icons are 20x20px with 44x44px touch targets
- Subtle animation when switching between toolbar states
- No visual clutter - icons only, no labels or explanations

---

## Risk Assessment
- **Low risk**: New editor is drop-in replacement
- **Backwards compatible**: Existing markdown content unchanged
- **No database changes**: Pure frontend enhancement
- **Graceful mobile handling**: Uses existing useIsMobile hook
