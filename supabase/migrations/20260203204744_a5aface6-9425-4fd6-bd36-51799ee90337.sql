-- =====================================================
-- COMPANY PAGES - Phase 1: Database Foundation
-- =====================================================

-- 1.1 Enum Types
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

-- 1.2 Core Tables

-- companies table
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

CREATE UNIQUE INDEX idx_companies_slug ON public.companies(slug);
CREATE INDEX idx_companies_name_lower ON public.companies(lower(name));
CREATE INDEX idx_companies_industry ON public.companies(industry);
CREATE INDEX idx_companies_location ON public.companies(location);
CREATE INDEX idx_companies_active ON public.companies(is_active) WHERE is_active = true;
CREATE INDEX idx_companies_search ON public.companies USING gin(search_vector);

-- company_roles table
CREATE TABLE public.company_roles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  role        public.company_role NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_roles_company ON public.company_roles(company_id);
CREATE INDEX idx_company_roles_user ON public.company_roles(user_id);

-- company_followers table
CREATE TABLE public.company_followers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, user_id)
);

CREATE INDEX idx_company_followers_company ON public.company_followers(company_id);
CREATE INDEX idx_company_followers_user ON public.company_followers(user_id);

-- company_employees table (with anti-ghosting index)
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

CREATE INDEX idx_company_employees_company ON public.company_employees(company_id);
CREATE INDEX idx_company_employees_user ON public.company_employees(user_id);

-- Anti-ghosting: Fast lookup for verified current employees
CREATE INDEX idx_company_employees_verified_current 
  ON public.company_employees(company_id) 
  WHERE is_verified = true AND end_date IS NULL;

-- company_audit_log table
CREATE TABLE public.company_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action        text NOT NULL,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_audit_company ON public.company_audit_log(company_id);
CREATE INDEX idx_company_audit_actor ON public.company_audit_log(actor_user_id);

-- reserved_company_slugs table
CREATE TABLE public.reserved_company_slugs (
  slug        text PRIMARY KEY,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- company_claim_requests table
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

CREATE INDEX idx_company_claim_company ON public.company_claim_requests(company_id);
CREATE INDEX idx_company_claim_requester ON public.company_claim_requests(requester_user_id);
CREATE INDEX idx_company_claim_status ON public.company_claim_requests(status);

-- 1.3 Modifications to Existing Tables

-- job_posts - add company_id
ALTER TABLE public.job_posts
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;
CREATE INDEX idx_job_posts_company_id ON public.job_posts(company_id);

-- ap_objects - add company_id
ALTER TABLE public.ap_objects
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX idx_ap_objects_company_id ON public.ap_objects(company_id);

-- articles - add company_id
ALTER TABLE public.articles
  ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;
CREATE INDEX idx_articles_company_id ON public.articles(company_id);

-- =====================================================
-- Phase 2: Functions, Triggers, and Data Integrity
-- =====================================================

-- 2.1 Role Helper (RLS-safe)
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

-- 2.2 Reserved Slug Checker
CREATE OR REPLACE FUNCTION public.is_slug_reserved(_slug text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.reserved_company_slugs WHERE slug = lower(_slug)
  );
$$;

-- 2.2b Trigger: Prevent Slug Changes (SEO Protection)
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

-- 2.3 Safe UUID Parser
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

-- 2.4 Search Vector Trigger
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

-- 2.5 Denormalized Count Triggers

-- Follower count trigger
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

-- Employee count trigger (current employees only)
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

-- Reconcile function for manual count fixes
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

-- 2.6 Self-Verification Hard Block
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

-- =====================================================
-- Phase 3: RLS Policies
-- =====================================================

-- companies RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active" ON public.companies FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated create" ON public.companies FOR INSERT TO authenticated
WITH CHECK (is_active = true AND NOT public.is_slug_reserved(slug));

CREATE POLICY "Admin update" ON public.companies FOR UPDATE TO authenticated
USING (public.has_company_role(auth.uid(), id, ARRAY['owner','admin']::public.company_role[]))
WITH CHECK (true);

-- company_roles RLS
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

-- company_followers RLS
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view followers" ON public.company_followers FOR SELECT TO authenticated USING (true);
CREATE POLICY "User follow" ON public.company_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User unfollow" ON public.company_followers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- company_employees RLS
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

-- company_audit_log RLS
ALTER TABLE public.company_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view audit" ON public.company_audit_log FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));

-- company_claim_requests RLS
ALTER TABLE public.company_claim_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own claims" ON public.company_claim_requests FOR SELECT TO authenticated
USING (requester_user_id = auth.uid());
CREATE POLICY "Admins view claims" ON public.company_claim_requests FOR SELECT TO authenticated
USING (public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[]));
CREATE POLICY "User create claim" ON public.company_claim_requests FOR INSERT TO authenticated
WITH CHECK (requester_user_id = auth.uid());

-- reserved_company_slugs RLS (public read, no user writes)
ALTER TABLE public.reserved_company_slugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view reserved slugs" ON public.reserved_company_slugs FOR SELECT USING (true);

-- =====================================================
-- Phase 7: Initial Data (Reserved Slugs)
-- =====================================================

INSERT INTO public.reserved_company_slugs (slug, reason) VALUES
  ('admin', 'System'),
  ('api', 'System'),
  ('support', 'System'),
  ('help', 'System'),
  ('nolto', 'Platform'),
  ('settings', 'System'),
  ('login', 'System'),
  ('signup', 'System'),
  ('auth', 'System'),
  ('company', 'System'),
  ('companies', 'System'),
  ('profile', 'System'),
  ('jobs', 'System'),
  ('events', 'System'),
  ('articles', 'System'),
  ('messages', 'System'),
  ('notifications', 'System'),
  ('search', 'System'),
  ('feed', 'System'),
  ('home', 'System');