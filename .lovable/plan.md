

# Company Pages Implementation Plan - Production-Ready Master

## Overview

This plan implements LinkedIn-style company pages for Nolto with security, scalability, and data-integrity guardrails. Companies become first-class citizens (posts, jobs, followers).

**Key Security Updates in this version:**
- **Anti-Ghosting**: Indexes and service logic ensure unverified employees don't show up on public profiles
- **Slug Immutability**: Trigger prevents SEO-breaking slug changes
- **Service Role Requirement**: Company creation logic enforces admin privileges for bootstrapping roles
- **Safe Storage**: UUID parsing protection

---

## Phase 1: Database Foundation with Guardrails

### 1.1 Enum Types

```sql
CREATE TYPE public.company_role AS ENUM ('owner', 'admin', 'editor');

CREATE TYPE public.company_claim_status AS ENUM
  ('unclaimed', 'claimed', 'disputed', 'verified');

CREATE TYPE public.company_size AS ENUM (
  '1-10', '11-50', '51-200', '201-500', '501-1000',
  '1001-5000', '5001-10000', '10000+'
);

CREATE TYPE public.employment_type AS ENUM
  ('full_time', 'part_time', 'contract', 'intern', 'freelance');

CREATE TYPE public.claim_request_status AS ENUM
  ('pending', 'approved', 'rejected');
```

### 1.2 Core Tables

#### companies

```sql
CREATE TABLE public.companies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  tagline         text,
  description     text,
  logo_url        text,
  banner_url      text,
  website         text,
  industry        text,
  size            public.company_size,
  location        text,
  founded_year    integer,

  claim_status    public.company_claim_status NOT NULL DEFAULT 'unclaimed',
  verified_method text,
  verified_at     timestamptz,

  is_active       boolean NOT NULL DEFAULT true,
  follower_count  integer NOT NULL DEFAULT 0,
  employee_count  integer NOT NULL DEFAULT 0,
  last_post_at    timestamptz,

  search_vector   tsvector,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_name_lower ON companies(lower(name));
CREATE INDEX idx_companies_industry ON companies(industry);
CREATE INDEX idx_companies_location ON companies(location);
CREATE INDEX idx_companies_active ON companies(is_active) WHERE is_active = true;
CREATE INDEX idx_companies_search ON companies USING gin(search_vector);
```

#### company_roles

```sql
CREATE TABLE public.company_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role        public.company_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_roles_company ON company_roles(company_id);
CREATE INDEX idx_company_roles_user ON company_roles(user_id);
```

#### company_followers

```sql
CREATE TABLE public.company_followers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_followers_company ON company_followers(company_id);
CREATE INDEX idx_company_followers_user ON company_followers(user_id);
```

#### company_employees (with anti-ghosting index)

```sql
CREATE TABLE public.company_employees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  title           text NOT NULL,
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  start_date      date NOT NULL,
  end_date        date,
  
  is_verified     boolean NOT NULL DEFAULT false,
  verified_at     timestamptz,
  verified_by     uuid,
  
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id, start_date)
);

CREATE INDEX idx_company_employees_company ON company_employees(company_id);
CREATE INDEX idx_company_employees_user ON company_employees(user_id);

-- Anti-ghosting: Fast lookup for verified current employees
CREATE INDEX idx_company_employees_verified_current 
  ON company_employees(company_id) 
  WHERE is_verified = true AND end_date IS NULL;
```

#### company_audit_log

```sql
CREATE TABLE public.company_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action        text NOT NULL,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_audit_company ON company_audit_log(company_id);
CREATE INDEX idx_company_audit_actor ON company_audit_log(actor_user_id);
```

#### reserved_company_slugs

```sql
CREATE TABLE public.reserved_company_slugs (
  slug        text PRIMARY KEY,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
```

#### company_claim_requests

```sql
CREATE TABLE public.company_claim_requests (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL,
  status            public.claim_request_status NOT NULL DEFAULT 'pending',
  evidence          jsonb,
  reviewed_by       uuid,
  reviewed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_claim_company ON company_claim_requests(company_id);
CREATE INDEX idx_company_claim_requester ON company_claim_requests(requester_user_id);
CREATE INDEX idx_company_claim_status ON company_claim_requests(status);
```

### 1.3 Modifications to Existing Tables

```sql
-- job_posts
ALTER TABLE public.job_posts
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX idx_job_posts_company_id ON public.job_posts(company_id);

-- ap_objects
ALTER TABLE public.ap_objects
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX idx_ap_objects_company_id ON public.ap_objects(company_id);

-- articles
ALTER TABLE public.articles
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX idx_articles_company_id ON public.articles(company_id);
```

---

## Phase 2: Functions, Triggers, and Data Integrity

### 2.1 Role Helper (RLS-safe)

```sql
CREATE OR REPLACE FUNCTION public.has_company_role(
  _user_id uuid,
  _company_id uuid,
  _roles public.company_role[]
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_roles
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = ANY(_roles)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.company_role[]) FROM public;
GRANT EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.company_role[]) TO authenticated;
```

### 2.2 Reserved Slug & Slug Safety

```sql
-- Checker
CREATE OR REPLACE FUNCTION public.is_slug_reserved(_slug text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reserved_company_slugs WHERE slug = lower(_slug)
  );
$$;

-- Trigger: Prevent Slug Changes (SEO Protection)
CREATE OR REPLACE FUNCTION public.prevent_slug_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
     RAISE EXCEPTION 'Company slug is immutable for SEO stability.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_slug_immutable
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.prevent_slug_change();
```

### 2.3 Safe UUID Parser

```sql
CREATE OR REPLACE FUNCTION public.safe_uuid(_text text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  RETURN _text::uuid;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;
```

### 2.4 Search Vector Trigger

```sql
CREATE OR REPLACE FUNCTION public.update_company_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.industry, '')), 'B');
  RETURN NEW;
END;
$$;

CREATE TRIGGER company_search_vector_update
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_company_search_vector();
```

### 2.5 Denormalized Count Triggers

**Follower count:**

```sql
CREATE OR REPLACE FUNCTION public.update_company_follower_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.companies SET follower_count = follower_count + 1, updated_at = now() WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.companies SET follower_count = GREATEST(follower_count - 1, 0), updated_at = now() WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER company_follower_count_trigger
  AFTER INSERT OR DELETE ON public.company_followers
  FOR EACH ROW EXECUTE FUNCTION public.update_company_follower_count();
```

**Employee count (current employees only):**

```sql
CREATE OR REPLACE FUNCTION public.update_company_employee_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.end_date IS NULL THEN
    UPDATE public.companies SET employee_count = employee_count + 1, updated_at = now() WHERE id = NEW.company_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.end_date IS NULL AND NEW.end_date IS NOT NULL THEN
      UPDATE public.companies SET employee_count = GREATEST(employee_count - 1, 0), updated_at = now() WHERE id = NEW.company_id;
    ELSIF OLD.end_date IS NOT NULL AND NEW.end_date IS NULL THEN
      UPDATE public.companies SET employee_count = employee_count + 1, updated_at = now() WHERE id = NEW.company_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.end_date IS NULL THEN
    UPDATE public.companies SET employee_count = GREATEST(employee_count - 1, 0), updated_at = now() WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER company_employee_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.company_employees
  FOR EACH ROW EXECUTE FUNCTION public.update_company_employee_count();
```

**Reconcile function:**

```sql
CREATE OR REPLACE FUNCTION public.recalc_company_counts(_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _followers int;
  _employees int;
BEGIN
  SELECT count(*) INTO _followers FROM public.company_followers WHERE company_id = _company_id;
  SELECT count(*) INTO _employees FROM public.company_employees WHERE company_id = _company_id AND end_date IS NULL;
  
  UPDATE public.companies
    SET follower_count = _followers,
        employee_count = _employees,
        updated_at = now()
  WHERE id = _company_id;
END;
$$;
```

### 2.6 Self-Verification Hard Block

```sql
CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() = NEW.user_id THEN
    IF (NEW.is_verified IS DISTINCT FROM OLD.is_verified)
      OR (NEW.verified_at IS DISTINCT FROM OLD.verified_at)
      OR (NEW.verified_by IS DISTINCT FROM OLD.verified_by) THEN
      RAISE EXCEPTION 'Users cannot modify verification fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER company_employees_prevent_self_verification
  BEFORE UPDATE ON public.company_employees
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_verification();
```

---

## Phase 3: RLS Policies

### companies

```sql
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active" ON public.companies FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated create" ON public.companies FOR INSERT TO authenticated
WITH CHECK (is_active = true AND NOT public.is_slug_reserved(slug));

CREATE POLICY "Admin update" ON public.companies FOR UPDATE TO authenticated
USING (public.has_company_role(auth.uid(), id, ARRAY['owner','admin']::public.company_role[]))
WITH CHECK (true);
```

### company_roles

```sql
ALTER TABLE public.company_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view roles" ON public.company_roles FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));

CREATE POLICY "Owners add roles" ON public.company_roles FOR INSERT TO authenticated
WITH CHECK (public.has_company_role(auth.uid(), company_id, ARRAY['owner']::public.company_role[]));

CREATE POLICY "Owners update roles" ON public.company_roles FOR UPDATE TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner']::public.company_role[]));

CREATE POLICY "Owners delete roles" ON public.company_roles FOR DELETE TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner']::public.company_role[])
       AND NOT (role = 'owner' AND user_id = auth.uid()));
```

### company_followers

```sql
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view followers" ON public.company_followers FOR SELECT TO authenticated USING (true);
CREATE POLICY "User follow" ON public.company_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User unfollow" ON public.company_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

### company_employees

```sql
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view employees" ON public.company_employees FOR SELECT USING (true);
CREATE POLICY "User claim employment" ON public.company_employees FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User update own" ON public.company_employees FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Admin update employees" ON public.company_employees FOR UPDATE TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));
CREATE POLICY "User delete own" ON public.company_employees FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin delete employees" ON public.company_employees FOR DELETE TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));
```

### company_audit_log & company_claim_requests

```sql
ALTER TABLE public.company_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit" ON public.company_audit_log FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));

ALTER TABLE public.company_claim_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own claims" ON public.company_claim_requests FOR SELECT TO authenticated
USING (requester_user_id = auth.uid());
CREATE POLICY "Admins view claims" ON public.company_claim_requests FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));
CREATE POLICY "User create claim" ON public.company_claim_requests FOR INSERT TO authenticated
WITH CHECK (requester_user_id = auth.uid());
```

---

## Phase 4: Storage Configuration

### Bucket: company-assets

| Setting | Value |
|---------|-------|
| Name | `company-assets` |
| Public | true |
| Size limit | 5MB |
| MIME types | `image/jpeg`, `image/png`, `image/webp`, `image/gif` |

### Storage Policies

```sql
CREATE POLICY "Public view assets" ON storage.objects FOR SELECT USING (bucket_id = 'company-assets');

CREATE POLICY "Admin manage assets" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND public.safe_uuid((storage.foldername(name))[1]) IS NOT NULL
  AND public.has_company_role(
    auth.uid(),
    public.safe_uuid((storage.foldername(name))[1]),
    ARRAY['owner','admin']::public.company_role[]
  )
);
```

---

## Phase 5: Backend Services

### 5.1 companyService.ts

| Function | Description | Notes |
|----------|-------------|-------|
| `createCompany(data)` | Create company + assign owner role | **Must use Service Role** to bypass RLS chicken-and-egg |
| `updateCompany(id, data)` | Update company details | Audit log entry |
| `getCompanyBySlug(slug)` | Fetch by URL-friendly slug | |
| `getCompanyById(id)` | Fetch by UUID | |
| `searchCompanies(query, filters)` | Full-text search | Industry/size/location filters |
| `deactivateCompany(id)` | Soft delete | Sets `is_active = false` |

### 5.2 companyEmployeeService.ts

| Function | Description | Notes |
|----------|-------------|-------|
| `getCompanyEmployees(companyId)` | List verified current employees | **WHERE is_verified = true AND end_date IS NULL** |
| `getPendingEmployees(companyId)` | List unverified claims | Admin dashboard only |
| `addEmployment(data)` | User claims employment | `is_verified = false` by default |
| `verifyEmployee(id)` | Admin verifies claim | Sets `is_verified = true` |
| `endEmployment(id)` | Set end_date | |

### 5.3 Other Services

- **companyRolesService.ts**: Role management (owner/admin/editor)
- **companyFollowService.ts**: Follow/unfollow + counts
- **companyAuditService.ts**: Audit log writes via Service Role
- **companyPostService.ts**: Company posts (local-only for V1)

---

## Phase 6: Frontend

### New Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/companies` | `Companies.tsx` | Directory with search/filter |
| `/company/:slug` | `CompanyProfile.tsx` | Company profile with tabs |
| `/companies/create` | `CompanyCreate.tsx` | Create company form |
| `/company/:slug/edit` | `CompanyEdit.tsx` | Edit settings (admins only) |
| `/company/:slug/admin` | `CompanyAdmin.tsx` | Admin dashboard |

### New Components

| Component | Purpose |
|-----------|---------|
| `CompanyCard.tsx` | Directory listing card |
| `CompanyHeader.tsx` | Profile header with logo/banner |
| `CompanyFollowButton.tsx` | Follow/unfollow toggle |
| `CompanyPostComposer.tsx` | Post as company (admins) |
| `CompanySearchFilter.tsx` | Industry/size/location filters |
| `CompanyEmployeeCard.tsx` | Employee display in People tab |
| `LinkToCompanyDialog.tsx` | Claim employment dialog |

### Modified Components

- `FederatedPostCard.tsx`: Company author support
- `JobCard.tsx`: Company linking
- `Navbar.tsx`: Add Companies link
- `GlobalSearch.tsx`: Include companies

---

## Phase 7: Initial Data

```sql
INSERT INTO public.reserved_company_slugs (slug, reason) VALUES
  ('admin', 'System'), ('api', 'System'), ('support', 'System'),
  ('help', 'System'), ('nolto', 'Platform'), ('settings', 'System'),
  ('login', 'System'), ('signup', 'System'), ('auth', 'System');
```

---

## Implementation Order (Risk-Minimized)

| Week | Focus | Deliverables |
|------|-------|--------------|
| 1 | Database | Enums, tables, indexes, RLS policies |
| 2 | Core CRUD | companyService, create/edit pages |
| 3 | Follow + Directory | Followers, search, Companies page |
| 4 | Posts | Company posts in feed, CompanyPostComposer |
| 5 | Jobs | Link jobs to companies |
| 6 | Employees | People tab, verification flow |
| 7 | Polish | Claims, audit log viewer, edge cases |

---

## Files Summary

### New Files

**Services (6):**
- `src/services/companyService.ts`
- `src/services/companyRolesService.ts`
- `src/services/companyFollowService.ts`
- `src/services/companyEmployeeService.ts`
- `src/services/companyAuditService.ts`
- `src/services/companyPostService.ts`

**Pages (5):**
- `src/pages/Companies.tsx`
- `src/pages/CompanyProfile.tsx`
- `src/pages/CompanyCreate.tsx`
- `src/pages/CompanyEdit.tsx`
- `src/pages/CompanyAdmin.tsx`

**Components (7+):**
- `src/components/company/CompanyCard.tsx`
- `src/components/company/CompanyHeader.tsx`
- `src/components/company/CompanyFollowButton.tsx`
- `src/components/company/CompanyPostComposer.tsx`
- `src/components/company/CompanySearchFilter.tsx`
- `src/components/company/CompanyEmployeeCard.tsx`
- `src/components/company/LinkToCompanyDialog.tsx`

### Modified Files

- `src/App.tsx` - Routes
- `src/components/Navbar.tsx` - Companies link
- `src/components/FederatedPostCard.tsx` - Company author
- `src/components/JobCard.tsx` - Company linking
- `src/services/searchService.ts` - Include companies
- `src/i18n/locales/en.json` - Translations

