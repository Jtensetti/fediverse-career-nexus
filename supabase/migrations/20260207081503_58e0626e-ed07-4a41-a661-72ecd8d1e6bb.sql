
-- =====================================================
-- Fix 1: Allow company editors+ to create posts in ap_objects
-- Fix 2: Allow company admins+ to delete company posts in ap_objects
-- Fix 3: Drop the unsafe direct INSERT policy on companies (slug squatting)
-- Fix 4: Tighten company_employees SELECT to only expose verified employees publicly
-- =====================================================

-- Fix 1: Company editors can INSERT company posts into ap_objects
CREATE POLICY "Company editors can create posts"
ON public.ap_objects FOR INSERT TO authenticated
WITH CHECK (
  company_id IS NOT NULL
  AND public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin','editor']::public.company_role[])
);

-- Fix 2: Company admins can DELETE company posts from ap_objects
CREATE POLICY "Company admins can delete posts"
ON public.ap_objects FOR DELETE TO authenticated
USING (
  company_id IS NOT NULL
  AND public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[])
);

-- Fix 3: Remove the open INSERT policy on companies
-- Only the edge function (using service role) should create companies
DROP POLICY IF EXISTS "Authenticated create" ON public.companies;

-- Fix 4: Replace the open SELECT on company_employees
-- Drop existing permissive "Anyone view employees" policy
DROP POLICY IF EXISTS "Anyone view employees" ON public.company_employees;

-- Public can only see verified, current employees
CREATE POLICY "Public view verified employees"
ON public.company_employees FOR SELECT
USING (is_verified = true);

-- Admins can see ALL employees (including unverified/pending)
CREATE POLICY "Admins view all employees"
ON public.company_employees FOR SELECT TO authenticated
USING (
  public.has_company_role(auth.uid(), company_id, ARRAY['owner','admin']::public.company_role[])
);

-- Users can always see their own employment records
CREATE POLICY "Users view own employment"
ON public.company_employees FOR SELECT TO authenticated
USING (auth.uid() = user_id);
