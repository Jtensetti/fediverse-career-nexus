-- Fix search_path on newly created functions for security

-- Fix prevent_slug_change
CREATE OR REPLACE FUNCTION public.prevent_slug_change()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
     RAISE EXCEPTION 'Company slug is immutable for SEO stability.';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix update_company_search_vector
CREATE OR REPLACE FUNCTION public.update_company_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.tagline, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.industry, '')), 'B');
  RETURN NEW;
END;
$$;

-- Fix update_company_follower_count
CREATE OR REPLACE FUNCTION public.update_company_follower_count()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.companies SET follower_count = follower_count + 1, updated_at = now() WHERE id = NEW.company_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.companies SET follower_count = GREATEST(follower_count - 1, 0), updated_at = now() WHERE id = OLD.company_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix update_company_employee_count
CREATE OR REPLACE FUNCTION public.update_company_employee_count()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
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

-- Fix prevent_self_verification
CREATE OR REPLACE FUNCTION public.prevent_self_verification()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
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