
# Company Pages Code Review -- Round 2

After a thorough second pass through all services, components, pages, edge functions, RLS policies, and database schema, here are the issues found.

---

## Critical Bugs

### 1. Company Posts Cannot Be Created or Deleted (RLS Blocker)

This is the most severe bug in the company pages system -- **company posts are completely broken**.

The `createCompanyPost` function in `companyPostService.ts` inserts into the `ap_objects` table with `company_id` set but `attributed_to` left as NULL. However, the `ap_objects` INSERT RLS policy requires:

```text
EXISTS (SELECT 1 FROM actors WHERE actors.id = ap_objects.attributed_to AND actors.user_id = auth.uid())
```

Since `attributed_to` is NULL for company posts, this check always fails. **Every company post creation attempt will be silently rejected by RLS.**

The same problem applies to deletion -- the DELETE policy also checks `attributed_to` against actors. So `deleteCompanyPost` is also broken.

**Fix:** Add new RLS policies on `ap_objects` specifically for company posts:
- INSERT: Allow if user has an editor+ role for the `company_id` being used
- DELETE: Allow if user has an admin+ role for the `company_id` on the row
- UPDATE: Same pattern

---

## Security Issues

### 2. Any Authenticated User Can Create Companies Directly (Slug Squatting)

The `companies` INSERT RLS policy is:
```text
WITH CHECK (is_active = true AND NOT is_slug_reserved(slug))
```

This allows **any authenticated user** to insert directly into the `companies` table via the Supabase client, completely bypassing the `company-create` edge function. When they do:
- The company is created with no owner role assigned (the edge function handles this)
- The slug is now permanently taken
- The company becomes an orphan that nobody can manage

A malicious user could squat on desirable slugs (e.g., `/company/google`, `/company/microsoft`) before legitimate organizations claim them.

**Fix:** Either:
- Remove the direct INSERT RLS policy entirely (only the edge function with service role should create companies), OR
- Add a trigger that requires a corresponding `company_roles` entry to be created within the same transaction

### 3. Unverified Employee Claims Are Publicly Readable

The `company_employees` SELECT policy uses `USING (true)` with no role restriction (`polroles: {-}` means all roles including anonymous). This means anyone -- even unauthenticated users -- can query the `company_employees` table directly and see **all** unverified claims, including who claimed to work where and what their title is.

While the frontend only shows verified employees, the raw data is exposed. This leaks information about pending claims that may not have been approved yet.

**Fix:** Either:
- Change the SELECT policy to only expose verified employees publicly: `USING (is_verified = true AND end_date IS NULL)`, and add a separate admin-only policy for viewing all employees, OR
- Accept this as a known limitation for V1 (the data isn't extremely sensitive)

---

## Moderate Issues

### 4. No Confirmation Dialogs for Destructive Admin Actions

In `CompanyAdmin.tsx`:
- **Rejecting an employee** (line 251) calls `handleReject` immediately on click -- no confirmation dialog. This permanently deletes the employee record.
- **Removing a role** (line 300) calls `handleRemoveRole` immediately on click -- no confirmation dialog. This could accidentally strip an admin's access.

The post deletion has a proper `AlertDialog` confirmation, but these admin actions do not.

**Fix:** Add `AlertDialog` confirmation before rejecting employees and removing roles.

### 5. `Loader2` Used as Static Stats Icon

In `CompanyAdmin.tsx` line 172, the `Loader2` icon (a spinner icon) is used as the static icon for the "Pending Verification" stats card. While it doesn't animate without the `animate-spin` class, it semantically represents loading/processing, not pending items.

**Fix:** Replace with a more appropriate icon like `Clock` or `Hourglass`.

### 6. `company_followers` SELECT is Authenticated-Only

The followers SELECT policy targets `authenticated` role only. This means:
- The denormalized `follower_count` on the companies table is visible publicly (correct)
- But the actual follower list from `company_followers` is not accessible to anonymous users
- `CompanyFollowButton` correctly handles the unauthenticated case by showing a "Follow" button that redirects to login
- However, if you ever want a public "X followers" list on the company profile, it would fail for anonymous users

This is acceptable for V1 but worth noting.

### 7. No "Add Role" UI in Admin Dashboard

The Roles tab shows existing roles and allows removal, but there is no UI for **adding** new admins or editors. The `addCompanyRole` function exists in `companyRolesService.ts` but is never called from any component. Company owners have no way to promote users through the UI.

**Fix:** Add a user search/invite form to the Roles tab that allows owners to add roles.

---

## Minor Issues

### 8. Orphaned Image Files on Company Update

When a logo or banner is updated via `CompanyImageUpload`, the old image is deleted. But if the company itself is deactivated (soft-deleted), all its images remain in the `company-assets` bucket permanently with no cleanup mechanism.

### 9. Employee Employment Type Display Uses Simple Replace

In `CompanyAdmin.tsx` line 242 and `CompanyPeopleTab.tsx` line 116, employment types are displayed with `emp.employment_type.replace("_", "-")`. This only replaces the first underscore, though in practice all current enum values only have one underscore. A regex replace or proper label mapping would be more robust.

### 10. Missing i18n on Admin Dashboard

The `CompanyAdmin.tsx` page has many hardcoded English strings that aren't wrapped in `t()` translation calls. For example: "Verification Queue", "Employees", "Pending Verification", "Admins and Editors", "Roles", "Audit Log", "All caught up", "No additional roles", etc. This breaks the existing internationalization pattern used throughout the rest of the app.

### 11. Company Edit Form Slug Check Runs on Every Render

In `CompanyForm.tsx`, when `isEdit=true` and the slug hasn't changed (`watchSlug === defaultValues?.slug`), the slug availability check sets `slugAvailable = true` and skips the API call. But the `useEffect` still runs on every render where `watchSlug` matches. This is not a bug but is slightly wasteful.

---

## Summary Table

| # | Severity | File(s) | Issue |
|---|----------|---------|-------|
| 1 | CRITICAL | ap_objects RLS + companyPostService.ts | Company posts cannot be created or deleted -- RLS blocks because `attributed_to` is NULL |
| 2 | SECURITY | companies RLS | Any authenticated user can insert directly, bypassing edge function and squatting slugs |
| 3 | SECURITY | company_employees RLS | Unverified employee claims readable by anonymous users |
| 4 | MODERATE | CompanyAdmin.tsx | No confirmation dialogs for reject employee and remove role actions |
| 5 | MODERATE | CompanyAdmin.tsx | Loader2 spinner icon used as static stats icon |
| 6 | MODERATE | company_followers RLS | Follower list is auth-only (not a bug, but a design decision to note) |
| 7 | MODERATE | CompanyAdmin.tsx | No UI to add new roles -- owners can't promote users |
| 8 | MINOR | companyImageService.ts | Orphaned images not cleaned up on company deactivation |
| 9 | MINOR | CompanyAdmin.tsx, CompanyPeopleTab.tsx | Employment type display uses simple string replace |
| 10 | MINOR | CompanyAdmin.tsx | Hardcoded English strings break i18n pattern |
| 11 | MINOR | CompanyForm.tsx | Minor useEffect inefficiency on edit mode |

---

## Implementation Plan

### Priority 1: Fix company post creation/deletion (Critical)

Add new RLS policies on `ap_objects` for company posts:

```text
-- Allow editors+ to create company posts
CREATE POLICY "Company editors can create posts"
ON ap_objects FOR INSERT TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND has_company_role(auth.uid(), company_id, ARRAY['owner','admin','editor']::company_role[])
);

-- Allow admins+ to delete company posts
CREATE POLICY "Company admins can delete posts"
ON ap_objects FOR DELETE TO authenticated
USING (
  company_id IS NOT NULL
  AND has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::company_role[])
);
```

### Priority 2: Lock down company creation

Remove the direct INSERT RLS policy on `companies` so only the edge function (service role) can create companies:

```text
DROP POLICY "Authenticated create" ON companies;
```

### Priority 3: Tighten employee visibility

Modify `company_employees` SELECT policy to only show verified employees publicly, with a separate admin policy for all employees.

### Priority 4: UI fixes

- Add confirmation dialogs for destructive admin actions
- Replace Loader2 icon with Clock
- Add i18n translation wrappers
- Add "Invite admin/editor" form to the Roles tab
