
# Minor Fixes: Verification Button, DM Link, and Freelancer Badge

## Issues Summary

### Issue 1: Verification Button Not Mobile Optimized
**Location:** `src/components/VerificationRequest.tsx` (lines 84-88)

The "Request Verification" button in the experience section has fixed text that doesn't adapt to mobile screens:
```tsx
<Button variant="outline" size="sm" className="gap-1">
  <ShieldCheck className="h-4 w-4" />
  Request Verification
</Button>
```

On mobile, this text gets truncated or causes layout issues when combined with the delete button.

**Solution:** On mobile, show only the icon. On larger screens, show icon + text.

---

### Issue 2: DM Settings Link Goes to Wrong Tab
**Location:** `src/components/FreelancerSettings.tsx` (lines 221-223)

The "Check DM settings" link currently navigates to `/profile/edit` without specifying the privacy tab:
```tsx
<Link to="/profile/edit" className="text-sm text-primary hover:underline">
  {t("freelancer.checkDmSettings", "Check DM settings →")}
</Link>
```

The ProfileEdit page uses Radix Tabs which supports URL hash navigation. Currently the tabs use `defaultValue="basic"` but don't respond to hash changes.

**Solution:** 
1. Change the link to `/profile/edit?tab=privacy`
2. Update ProfileEdit to read the `tab` query parameter and set the active tab accordingly

---

### Issue 3: Freelancer Badge Not Shown on Profile Avatar
**Location:** `src/pages/Profile.tsx` (lines 331-337 and 401-408)

The `AvatarWithStatus` component supports an `isFreelancer` prop that displays a green ring with a briefcase icon, but Profile.tsx doesn't pass this prop:
```tsx
<AvatarWithStatus
  src={profile.avatarUrl}
  alt={profile.displayName}
  fallback={profile.displayName?.substring(0, 2)}
  status={avatarStatus}
  size="2xl"
  // Missing: isFreelancer={profile.isFreelancer}
/>
```

The profile data already contains `isFreelancer` from the database, but it's not being passed to the avatar component.

**Solution:** Pass `isFreelancer={profile.isFreelancer}` to both `AvatarWithStatus` instances on the Profile page.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/VerificationRequest.tsx` | Make button text responsive (icon-only on mobile) |
| `src/components/FreelancerSettings.tsx` | Update link to include `?tab=privacy` parameter |
| `src/pages/ProfileEdit.tsx` | Read tab from URL query params and control tab state |
| `src/pages/Profile.tsx` | Add `isFreelancer={profile.isFreelancer}` to both avatar instances |

---

## Technical Implementation

### Fix 1: Mobile-Optimized Verification Button

**File:** `src/components/VerificationRequest.tsx`

Change the trigger button to hide text on small screens:

```tsx
<DialogTrigger asChild>
  <Button variant="outline" size="sm" className="gap-1">
    <ShieldCheck className="h-4 w-4" />
    <span className="hidden sm:inline">Request Verification</span>
  </Button>
</DialogTrigger>
```

This uses Tailwind's responsive classes:
- `hidden`: Hide text by default (mobile)
- `sm:inline`: Show text on screens >= 640px

### Fix 2: DM Settings Link Navigation

**File:** `src/components/FreelancerSettings.tsx` (line 221)

Change link destination:
```tsx
<Link to="/profile/edit?tab=privacy" className="text-sm text-primary hover:underline">
```

Also update the toast action (line 100):
```tsx
onClick: () => window.location.href = "/profile/edit?tab=privacy",
```

**File:** `src/pages/ProfileEdit.tsx`

Add URL query parameter handling:

1. Import `useSearchParams` from react-router-dom
2. Read the `tab` parameter
3. Use controlled `value` instead of `defaultValue` on Tabs
4. Update URL when tab changes

```tsx
import { useNavigate, useSearchParams } from "react-router-dom";

const ProfileEditPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'basic';
  
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  // In the render:
  <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
```

### Fix 3: Freelancer Badge on Profile Avatar

**File:** `src/pages/Profile.tsx`

Add the `isFreelancer` prop to both `AvatarWithStatus` instances:

**Sticky header avatar (around line 331):**
```tsx
<AvatarWithStatus
  src={profile.avatarUrl}
  alt={profile.displayName}
  fallback={profile.displayName?.substring(0, 2)}
  status={avatarStatus}
  size="sm"
  isFreelancer={profile.isFreelancer}
/>
```

**Main profile avatar (around line 401):**
```tsx
<AvatarWithStatus
  src={profile.avatarUrl}
  alt={profile.displayName}
  fallback={profile.displayName?.substring(0, 2)}
  status={avatarStatus}
  size="2xl"
  ringClassName={profile.isVerified ? "ring-primary" : "ring-background"}
  isFreelancer={profile.isFreelancer}
/>
```

---

## Expected Outcomes

| Issue | Before | After |
|-------|--------|-------|
| Verification button | Full text on all screens, causes overflow | Icon-only on mobile, full text on desktop |
| DM settings link | Opens ProfileEdit on Basic Info tab | Opens ProfileEdit directly on Privacy tab |
| Freelancer badge | No visual indicator on profile avatar | Green ring with briefcase icon when "Open for Work" is enabled |
