

# Company Pages Code Review -- Round 3: Critical Errors

## CRITICAL: 5 blocking issues found

---

## 1. CRITICAL: Editors Are Completely Broken (RLS Gap)

The `company_roles` table SELECT policy ("Admins view roles") only allows users with `owner` or `admin` roles to read rows:

```text
USING(has_company_role(auth.uid(), company_id, ARRAY['owner','admin']))
```

This creates a **circular dependency** for editors: `has_company_role()` calls a SELECT on `company_roles`, but the SELECT policy itself calls `has_company_role()`, which only checks for owner/admin. An editor cannot read their own row from `company_roles`.

**Impact chain:**
- `getUserCompanyRole()` returns `null` for editors (cannot SELECT their own role)
- `canEditWithRole(null)` returns `false`
- CompanyPostComposer is hidden from editors
- Even if forced, `createCompanyPost()` queries `company_roles` to verify permission and would fail
- The entire editor role is non-functional

**Fix:** Add a new SELECT policy allowing users to read their own role:

```sql
CREATE POLICY "Users view own role" ON public.company_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

---

## 2. CRITICAL: Duplicate SELECT Policies on `company_employees` (Old Policy Not Dropped)

The latest migration added "Public view verified employees" with `USING(is_verified = true)`, but the **old** "Public view employees" with `USING(true)` was never dropped. Both policies currently exist:

```text
"Public view employees"          -> USING(true)           -- OLD, should have been dropped
"Public view verified employees" -> USING(is_verified = true)  -- NEW
```

PostgreSQL ORs multiple SELECT policies on the same table. Since `true OR (is_verified = true)` is always `true`, the verified-only filter is completely ineffective. **All unverified employee claims are still publicly visible.**

**Fix:** Drop the old policy:

```sql
DROP POLICY "Public view employees" ON public.company_employees;
```

---

## 3. CRITICAL: `intern` vs `internship` Mismatch in Employment Type Labels

The database enum defines the value as `intern`:

```text
Database enum values: full_time, part_time, contract, intern, freelance
```

But `formatEmploymentType()` in `src/components/company/admin/utils.ts` maps `internship` (not `intern`):

```typescript
const labels = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  internship: "Internship",  // WRONG - should be "intern"
  freelance: "Freelance",
  temporary: "Temporary",    // Does not exist in enum either
};
```

When an employee selects "Intern" from the form (value `intern`), the display will fall through to the fallback `type.replace(/_/g, "-")` showing lowercase "intern" instead of properly capitalized "Intern".

**Fix:** Update the labels map to use `intern` instead of `internship`.

---

## 4. No Navigation to Company Pages

There is **no link to `/companies` anywhere** in the main navigation:

- **Desktop navbar** (`authenticatedNavigationItems`): Feed, Connections, Articles, Jobs, Events, Messages -- no Companies
- **Mobile hamburger menu**: Same items -- no Companies
- **Mobile bottom nav** (`MobileBottomNav`): Feed, Jobs, Messages, Profile -- no Companies

Users can only reach company pages through:
- Direct URL
- Search results (if Global Search indexes companies)
- Links from job posts (if linked to a company)

**Fix:** Add "Companies" to the navigation items in `Navbar.tsx` and consider the mobile sidebar menu.

---

## 5. Hardcoded English Strings Across Multiple Components

The following components have English strings not wrapped in `t()` translation calls, breaking i18n:

**CompanyHeader.tsx:**
- "Admin", "Settings" (button labels, lines 105-112)
- "followers", "employees", "company size" (stats, lines 157-167)
- "Founded" (line 149)

**CompanyForm.tsx:**
- "Basic Information", "Enter the core details about your company" (lines 139-144)
- "Company Name *", "Company URL *" (form labels)
- "Available", "Taken" (slug status, lines 178-181)
- "Company Details", "Company Size", "Headquarters", "Founded Year" etc.
- "Company URL cannot be changed after creation"

**CompanyPostCard.tsx:**
- "Delete", "Cancel", "Delete post?", "Deleting..." (lines 99-175)
- "This action cannot be undone. The post will be permanently deleted."
- "Company" fallback (line 79)

**CompanyImageUpload.tsx:**
- "Please upload an image file" (line 33)
- "Image must be smaller than..." (line 38)
- "Uploading...", "Change {type}" (lines 89-90)
- "Logo updated", "Banner updated" (line 56)

**CompanyFollowButton.tsx:**
- "Follow", "Following" (lines 92, 112)
- "Now following this company", "Unfollowed company" (lines 48, 69)
- "Failed to follow/unfollow company" (lines 41, 62)

---

## Additional Issues (Non-Blocking)

### 6. CompanySearchFilter Fixed Widths Break on Mobile
The industry select uses `w-[180px]` and size select uses `w-[160px]`. On screens smaller than 375px, these fixed-width elements plus the location input don't wrap properly and can overflow horizontally.

**Fix:** Use responsive widths like `w-full sm:w-[180px]`.

### 7. CompanyCreate Page Has No Back/Cancel Button
Unlike CompanyEdit which has a back button, the CompanyCreate page has no way to go back to `/companies` other than the browser back button.

### 8. ShareButton Inside DropdownMenuItem May Cause Nesting Issues
In `CompanyPostCard.tsx` line 102-109, `ShareButton` is rendered as a child of `DropdownMenuItem`. `ShareButton` renders its own `Button` component, creating a nested interactive element (button inside a menu item button). This can cause accessibility warnings and click handling issues.

---

## Implementation Plan

### Step 1: RLS Migration (fixes 1, 2)

```sql
-- Fix 1: Allow editors to read their own role
CREATE POLICY "Users view own role" ON public.company_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Fix 2: Drop the old blanket SELECT policy
DROP POLICY "Public view employees" ON public.company_employees;
```

### Step 2: Fix employment type labels (fix 3)

Update `src/components/company/admin/utils.ts`:
- Change `internship` key to `intern`
- Remove `temporary` (not in enum)

### Step 3: Add Companies to navigation (fix 4)

Update `src/components/Navbar.tsx`:
- Add `{ name: t("nav.companies", "Companies"), href: "/companies" }` to `authenticatedNavigationItems`

### Step 4: i18n wrap all hardcoded strings (fix 5)

Update `CompanyHeader.tsx`, `CompanyForm.tsx`, `CompanyPostCard.tsx`, `CompanyImageUpload.tsx`, `CompanyFollowButton.tsx` to wrap all English strings in `t()` calls, and add keys to `en.json` and `sv.json`.

### Step 5: Mobile/UX fixes (fixes 6, 7, 8)

- Make CompanySearchFilter widths responsive
- Add back button to CompanyCreate
- Fix ShareButton nesting in CompanyPostCard

