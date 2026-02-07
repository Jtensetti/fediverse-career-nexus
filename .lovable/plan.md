

# Company Pages Code Review -- Issues Found

After a thorough review of all company-related services, components, pages, edge functions, migrations, and types, here are the issues I found, grouped by severity.

---

## Critical Bugs

### 1. Editors Cannot Post (Permission Logic Bug)

**File:** `src/pages/CompanyProfile.tsx` line 50

The company post composer visibility uses `canManageWithRole()` which only allows `owner` and `admin`. But the plan explicitly defines an `editor` role whose purpose is to create content. The `canEditWithRole()` helper exists in `companyRolesService.ts` but is never used.

```text
Current:  const canPost = canManageWithRole(userRole || null);  // owner, admin only
Should be: const canPost = canEditWithRole(userRole || null);   // owner, admin, editor
```

The same issue applies to `canDelete` on line 175 -- editors should probably be allowed to post but not delete. This needs to be separated:
- `canPost` should use `canEditWithRole` (owner, admin, editor)
- `canDelete` should use `canManageWithRole` (owner, admin only)

### 2. `rounded-inherit` is Not a Valid CSS/Tailwind Class

**File:** `src/components/company/CompanyImageUpload.tsx` line 81

The overlay button uses `rounded-inherit` which does not exist in Tailwind CSS. This means the hover overlay on image upload will have square corners instead of matching the parent's border radius. It should be a standard Tailwind rounding class or use `[border-radius:inherit]`.

---

## Moderate Issues

### 3. No INSERT RLS Policy for `company_audit_log`

The `company_audit_log` table only has a SELECT policy ("Admins view audit"). There is no INSERT policy for authenticated users. Currently this works because the only insert happens in the `company-create` edge function via service role. However, if any client-side code ever tries to write an audit entry (e.g., for employee verification, role changes), it will silently fail due to RLS.

**Impact:** Currently low (edge function bypasses RLS), but will become a bug the moment audit logging is added to client-side admin actions like verify/reject employee or remove role.

### 4. Employee Verification Does Not Create Audit Log Entries

When an admin verifies or rejects an employee in `CompanyAdmin.tsx`, no audit log entry is created. The handlers call `verifyEmployee()` and `removeEmployee()` directly but never log the action. The audit log will appear empty despite admin activity.

### 5. Role Removal Does Not Create Audit Log Entries

Same issue: `handleRemoveRole` in `CompanyAdmin.tsx` calls `removeCompanyRole()` but does not log the action.

### 6. Admin Dashboard Shows Truncated User IDs Instead of Names

**File:** `src/pages/CompanyAdmin.tsx` line 275

The Roles tab displays `{role.user_id.slice(0, 8)}...` instead of the user's actual name. The `getCompanyRoles()` service returns raw role rows without profile data. This should be enriched with profile names/avatars like the employee lists are.

---

## Minor Issues

### 7. `isSlugAvailable` Does Not Check Deactivated Companies

**File:** `src/services/companyService.ts` lines 192-199

The slug availability check only queries for existing companies without filtering by `is_active`. This is actually correct behavior (slugs should remain reserved even for deactivated companies). No change needed -- but worth noting the query doesn't filter `is_active`, which is intentional for slug uniqueness.

### 8. Company Post Uses Hardcoded `image/jpeg` Media Type

**File:** `src/services/companyPostService.ts` line 91

When creating a company post with an image, the ActivityPub attachment always uses `mediaType: 'image/jpeg'` regardless of the actual file type (could be PNG, WebP, etc.). The actual file type from the upload should be used instead.

### 9. `CompanySearchFilter` Uses Direct State Effects for Industry Fetching

**File:** `src/components/company/CompanySearchFilter.tsx` lines 33-35

Industries are fetched with `useEffect` + `.then()` instead of `useQuery`. This means no caching, no error handling, no loading states, and the fetch runs on every mount. Minor, but inconsistent with the rest of the codebase pattern.

### 10. `canPost` Used for Both Posting and Deleting

**File:** `src/pages/CompanyProfile.tsx` line 175

The `canDelete` prop is set to the same value as `canPost`. Editors should be able to post but perhaps not delete other editors' posts. Once bug #1 is fixed (editors can post), this becomes a real permissions question.

### 11. No Optimistic Update on Follow/Unfollow

**File:** `src/components/company/CompanyFollowButton.tsx`

When following/unfollowing, the button waits for the full round-trip before updating. This could feel sluggish. Minor UX concern.

---

## Summary of Fixes Needed

| # | Severity | File | Fix |
|---|----------|------|-----|
| 1 | Critical | CompanyProfile.tsx | Use `canEditWithRole` for posting, `canManageWithRole` for deleting |
| 2 | Critical | CompanyImageUpload.tsx | Replace `rounded-inherit` with `[border-radius:inherit]` |
| 3 | Moderate | Migration/RLS | Add INSERT policy for `company_audit_log` for admin users |
| 4 | Moderate | CompanyAdmin.tsx | Add audit log entries for verify/reject/role actions |
| 5 | Moderate | CompanyAdmin.tsx | Same as #4 for role removal |
| 6 | Moderate | CompanyAdmin.tsx + companyRolesService | Enrich roles with profile data (names, avatars) |
| 7 | N/A | companyService.ts | No change needed (correct behavior) |
| 8 | Minor | companyPostService.ts | Use actual file MIME type for attachments |
| 9 | Minor | CompanySearchFilter.tsx | Migrate to `useQuery` for industry fetching |
| 10 | Minor | CompanyProfile.tsx | Separate `canPost` and `canDelete` permissions |
| 11 | Minor | CompanyFollowButton.tsx | Add optimistic updates |

