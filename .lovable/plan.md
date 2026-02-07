

# Company Pages Implementation - Status Report

## Summary

The plan has made **strong progress through Phases 1-5**, with the core database foundation, security guardrails, and basic frontend all in place. However, several key features remain unfinished, particularly around the **People/Employees tab**, **Admin dashboard**, **Claims workflow**, and **Storage bucket**.

---

## What Has Been Done (Completed)

### Phase 1: Database Foundation -- COMPLETE
- All 5 enum types created: `company_role`, `company_claim_status`, `company_size`, `employment_type`, `claim_request_status`
- All 7 tables created with correct schema:
  - `companies` (all 22 columns including `search_vector`, `claim_status`, `follower_count`, `employee_count`)
  - `company_roles` (with unique constraint on company_id + user_id)
  - `company_followers`
  - `company_employees` (with verification fields and the `idx_company_employees_verified_current` index)
  - `company_audit_log`
  - `reserved_company_slugs` (seeded with 20 reserved slugs, more than the original 9)
  - `company_claim_requests`
- All 3 existing table modifications done:
  - `job_posts.company_id` column added
  - `ap_objects.company_id` column added
  - `articles.company_id` column added

### Phase 2: Functions, Triggers, and Data Integrity -- COMPLETE
All 9 functions exist in the database:
- `has_company_role()` -- RLS-safe role checker
- `is_slug_reserved()` -- Reserved slug checker
- `prevent_slug_change()` -- Slug immutability trigger
- `safe_uuid()` -- Safe UUID parser
- `update_company_search_vector()` -- Full-text search trigger
- `update_company_follower_count()` -- Denormalized follower count
- `update_company_employee_count()` -- Denormalized employee count (current only)
- `recalc_company_counts()` -- Reconciliation function
- `prevent_self_verification()` -- Self-verification hard block

### Phase 3: RLS Policies -- COMPLETE
All RLS policies are in place across all 6 tables:
- `companies`: 3 policies (public view, authenticated create, admin update)
- `company_roles`: 4 policies (admin view, owner add/update/delete with self-delete protection)
- `company_followers`: 3 policies (auth view, user follow/unfollow)
- `company_employees`: 6 policies (public view, user claim/update/delete, admin update/delete)
- `company_audit_log`: 1 policy (admin view)
- `company_claim_requests`: 3 policies (user view own, admin view, user create)

### Phase 5: Backend Services -- MOSTLY COMPLETE
- `companyService.ts` -- Full CRUD, search with filters, slug generation/validation, deactivation
- `companyRolesService.ts` -- Role checking (sync and async), CRUD for roles, user company listing
- `companyFollowService.ts` -- Follow/unfollow, status check, follower listing, followed companies
- `companyPostService.ts` -- Create/delete company posts (local-only V1), get company posts with company branding
- `company-create` edge function -- Service role company creation (solves RLS chicken-and-egg), with audit logging

### Phase 6: Frontend Pages -- PARTIALLY COMPLETE
- `/companies` -- Company directory with search/filter (CompanySearchFilter component) -- DONE
- `/companies/create` -- Company creation form (protected route) -- DONE
- `/company/:slug` -- Public profile with tabs (About, Posts, Jobs, People) -- DONE but People tab is a stub
- `/company/:slug/edit` -- Edit form with access control -- DONE
- All routes registered in App.tsx with proper `ProtectedRoute` wrapping

### Frontend Components -- DONE
- `CompanyCard` -- Directory card
- `CompanyHeader` -- Profile header with banner, logo, metadata, stats, verified badge
- `CompanyFollowButton` -- Follow/unfollow toggle
- `CompanyForm` -- Create/edit form
- `CompanySearchFilter` -- Search and filter UI
- `CompanyPostComposer` -- Post creation as company
- `CompanyPostCard` -- Company post display

---

## What Is Left (Not Yet Implemented)

### Phase 4: Storage Configuration -- NOT DONE
- The `company-assets` storage bucket does **not exist** yet
- No storage policies for company logo/banner uploads
- Currently, company logo and banner URLs exist in the schema but there is **no upload UI** in CompanyForm or CompanyHeader

### Phase 5: Missing Services
- **`companyEmployeeService.ts`** -- Does not exist. No service for:
  - Fetching verified current employees (public People tab)
  - Fetching pending/unverified employees (admin dashboard)
  - Adding yourself as an employee ("I work here")
  - Admin verification/rejection of employee claims
- **`companyAuditService.ts`** -- Does not exist. No service for viewing audit logs

### Phase 6: Incomplete Frontend

#### People Tab (stub only)
The People tab on `/company/:slug` currently shows a static empty state. It needs:
- List of verified current employees with profiles
- "I work here" button for authenticated users to claim employment
- Employee add form (title, employment type, start date)
- Links to employee profiles

#### Admin Dashboard -- NOT STARTED
No `/company/:slug/admin` route or page exists. Planned features:
- Employee verification queue (pending employees with Verify/Reject buttons)
- Role management UI (add/remove admins and editors)
- Audit log viewer
- Company analytics/stats

#### Logo/Banner Upload UI -- NOT DONE
The CompanyForm does not include image upload for logo or banner. The CompanyHeader renders them if URLs exist, but there is no way to set them through the UI.

### Phase 7: ActivityPub Integration -- DEFERRED (V1 is local-only, which is working)
Company posts are correctly local-only in V1. Federation of company posts is a future phase.

### Phase 8: Claims Workflow -- NOT STARTED
- No UI for submitting a company claim request
- No admin UI for reviewing claim requests
- The `company_claim_requests` table and RLS policies exist, but nothing uses them yet

### Phase 9: Jobs Integration -- PARTIALLY DONE
- `job_posts.company_id` column exists
- `getJobsByCompanyId()` function exists and is called from CompanyProfile
- Jobs tab renders on the company profile
- **Missing**: UI to link a job post to a company during job creation/editing

---

## Priority Order for Remaining Work

1. **Storage bucket + upload UI** -- Enable logo/banner uploads for company pages
2. **Employee service + People tab** -- The most visible missing feature on company profiles
3. **Admin dashboard** -- Employee verification, role management, audit log
4. **Job linking** -- Connect job creation form to company pages
5. **Claims workflow UI** -- Allow users to claim unclaimed companies
6. **ActivityPub (V2)** -- Federate company posts

